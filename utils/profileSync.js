const { RichPresence } = require('discord.js-selfbot-v13');
const pool = require('../db');
const {
    normalizeButtonPair,
    normalizeOptionalInteger,
    normalizeOptionalText
} = require('./activitySettings');

const DEFAULT_STREAMING_URL = 'https://www.twitch.tv/discord';
const DEFAULT_APPLICATION_ID = /^[0-9]{17,19}$/.test(String(process.env.CLIENT_ID || '').trim())
    ? String(process.env.CLIENT_ID).trim()
    : null;
const clientStates = new Map();
const syncIntervals = new WeakMap();

function normalizeProfileSettings(row = {}) {
    let sharedButton1 = null;
    let sharedButton2 = null;

    try {
        sharedButton1 = normalizeButtonPair(row.activity_button_1_label, row.activity_button_1_url);
    } catch (error) {
        sharedButton1 = null;
    }

    try {
        sharedButton2 = normalizeButtonPair(row.activity_button_2_label, row.activity_button_2_url);
    } catch (error) {
        sharedButton2 = null;
    }

    return {
        largeImageUrl: normalizeOptionalText(row.large_image_url),
        smallImageUrl: normalizeOptionalText(row.small_image_url),
        sharedButtons: [sharedButton1, sharedButton2].filter(Boolean).slice(0, 2),
        streaming: {
            title: normalizeOptionalText(row.streaming_text),
            details: normalizeOptionalText(row.streaming_details),
            elapsedSeconds: normalizeOptionalInteger(row.streaming_elapsed_seconds)
        },
        rpc1: {
            title: normalizeOptionalText(row.rpc_text_1 || row.rpc_text),
            details: normalizeOptionalText(row.rpc_details_1),
            elapsedSeconds: normalizeOptionalInteger(row.rpc_elapsed_seconds_1)
        },
        rpc2: {
            title: normalizeOptionalText(row.rpc_text_2),
            details: normalizeOptionalText(row.rpc_details_2),
            elapsedSeconds: normalizeOptionalInteger(row.rpc_elapsed_seconds_2)
        }
    };
}

function applyActivityAssets(activity, settings) {
    try {
        if (settings.largeImageUrl) {
            activity.setAssetsLargeImage(settings.largeImageUrl);
        }
    } catch (error) {
        // Ignore invalid image payloads and continue syncing the rest.
    }

    try {
        if (settings.smallImageUrl) {
            activity.setAssetsSmallImage(settings.smallImageUrl);
        }
    } catch (error) {
        // Ignore invalid image payloads and continue syncing the rest.
    }
}

function applySharedButtons(activity, sharedButtons) {
    if (!sharedButtons.length) {
        return;
    }

    try {
        activity.setButtons(...sharedButtons);
    } catch (error) {
        // Ignore invalid button payloads until the user stores a valid one.
    }
}

function applyElapsedTimestamp(activity, elapsedSeconds) {
    if (!Number.isInteger(elapsedSeconds) || elapsedSeconds < 0) {
        return;
    }

    activity.setStartTimestamp(Date.now() - (elapsedSeconds * 1000));
}

function assignActivityIdentity(activity, activityId, index) {
    activity.id = activityId;
    activity.sessionId = activityId;
    activity.createdTimestamp = Date.now() + index;
}

function createActivity(client, descriptor, settings) {
    const activity = new RichPresence(client)
        .setName(descriptor.title)
        .setType(descriptor.type);

    assignActivityIdentity(activity, descriptor.activityId, descriptor.index);

    if (DEFAULT_APPLICATION_ID) {
        activity.setApplicationId(DEFAULT_APPLICATION_ID);
    }

    if (descriptor.type === 'STREAMING') {
        activity.setURL(DEFAULT_STREAMING_URL);
    }

    if (descriptor.details) {
        activity.setDetails(descriptor.details);
    }

    applyElapsedTimestamp(activity, descriptor.elapsedSeconds);
    applyActivityAssets(activity, settings);

    return activity;
}

function buildActivities(client, settings) {
    const descriptors = [];

    if (settings.streaming.title) {
        descriptors.push({
            activityId: 'vc-streaming',
            type: 'STREAMING',
            title: settings.streaming.title,
            details: settings.streaming.details,
            elapsedSeconds: settings.streaming.elapsedSeconds
        });
    }

    if (settings.rpc1.title) {
        descriptors.push({
            activityId: 'vc-rpc-1',
            type: 'PLAYING',
            title: settings.rpc1.title,
            details: settings.rpc1.details,
            elapsedSeconds: settings.rpc1.elapsedSeconds
        });
    }

    if (settings.rpc2.title) {
        descriptors.push({
            activityId: 'vc-rpc-2',
            type: 'PLAYING',
            title: settings.rpc2.title,
            details: settings.rpc2.details,
            elapsedSeconds: settings.rpc2.elapsedSeconds
        });
    }

    const activities = descriptors.map((descriptor, index) => createActivity(client, {
        ...descriptor,
        index
    }, settings));

    // Discord often collapses multi-activity payloads when every item carries
    // button metadata, so shared buttons are attached only to the first item.
    if (activities.length) {
        applySharedButtons(activities[0], settings.sharedButtons);
    }

    return activities;
}

function buildSettingsSignature(settings) {
    return JSON.stringify({
        presenceVersion: 2,
        applicationId: DEFAULT_APPLICATION_ID,
        settings
    });
}

async function applyStoredProfileSettings(client) {
    if (!client.user?.id) return;

    const [rows] = await pool.execute(
        `SELECT
            streaming_text,
            streaming_details,
            streaming_elapsed_seconds,
            rpc_text,
            rpc_text_1,
            rpc_details_1,
            rpc_elapsed_seconds_1,
            rpc_text_2,
            rpc_details_2,
            rpc_elapsed_seconds_2,
            large_image_url,
            small_image_url,
            activity_button_1_label,
            activity_button_1_url,
            activity_button_2_label,
            activity_button_2_url
         FROM user_settings
         WHERE user_id = ?`,
        [client.user.id]
    );

    const settings = normalizeProfileSettings(rows[0] || {});
    const signature = buildSettingsSignature(settings);

    if (clientStates.get(client.user.id) === signature) {
        return;
    }

    const activities = buildActivities(client, settings);

    if (!activities.length) {
        await Promise.resolve(client.user.setPresence({ activities: [] }));
        clientStates.set(client.user.id, signature);
        return;
    }

    await Promise.resolve(client.user.setPresence({ activities }));
    clientStates.set(client.user.id, signature);
}

function startProfileSync(client) {
    if (syncIntervals.has(client)) {
        return syncIntervals.get(client);
    }

    const sync = () => applyStoredProfileSettings(client).catch(error => {
        console.error(`[ProfileSync] ${client.user?.id || 'unknown'}`, error.message);
    });

    const intervalId = setInterval(sync, 30 * 1000);
    syncIntervals.set(client, intervalId);
    sync();

    return intervalId;
}

function stopProfileSync(client) {
    const intervalId = syncIntervals.get(client);
    if (intervalId) {
        clearInterval(intervalId);
        syncIntervals.delete(client);
    }

    if (client.user?.id) {
        clientStates.delete(client.user.id);
    }
}

module.exports = {
    applyStoredProfileSettings,
    startProfileSync,
    stopProfileSync
};
