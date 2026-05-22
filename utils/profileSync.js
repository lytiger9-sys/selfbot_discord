const { RichPresence } = require('discord.js-selfbot-v13');
const pool = require('../db');
const {
    normalizeButtonPair,
    normalizeOptionalInteger,
    normalizeOptionalText
} = require('./activitySettings');

const DEFAULT_APPLICATION_ID = /^[0-9]{17,19}$/.test(String(process.env.CLIENT_ID || '').trim())
    ? String(process.env.CLIENT_ID).trim()
    : null;
const clientStates = new Map();
const clientStateAppliedAt = new Map();
const syncIntervals = new WeakMap();
const PRESENCE_REFRESH_WINDOW_MS = 2 * 60 * 1000;

function normalizeStoredButtons(...candidates) {
    const buttons = [];

    for (const candidate of candidates) {
        if (!candidate) {
            continue;
        }

        try {
            const button = normalizeButtonPair(candidate.label, candidate.url);
            if (button) {
                buttons.push(button);
            }
        } catch (error) {
            continue;
        }
    }

    return buttons.slice(0, 2);
}

function pickPrimaryLinkUrl(buttons = []) {
    if (!Array.isArray(buttons) || buttons.length === 0) {
        return null;
    }

    return normalizeOptionalText(buttons[0]?.url);
}

function normalizeProfileSettings(row = {}) {
    return {
        streaming: {
            title: normalizeOptionalText(row.streaming_text),
            details: normalizeOptionalText(row.streaming_details),
            elapsedSeconds: normalizeOptionalInteger(row.streaming_elapsed_seconds),
            largeImageUrl: normalizeOptionalText(row.streaming_large_image_url),
            smallImageUrl: normalizeOptionalText(row.streaming_small_image_url),
            buttons: normalizeStoredButtons(
                { label: row.streaming_button_label, url: row.streaming_button_url },
                { label: row.streaming_button_label_2, url: row.streaming_button_url_2 }
            )
        },
        rpc: {
            title: normalizeOptionalText(row.rpc_text_1 || row.rpc_text),
            details: normalizeOptionalText(row.rpc_details_1),
            elapsedSeconds: normalizeOptionalInteger(row.rpc_elapsed_seconds_1),
            largeImageUrl: normalizeOptionalText(row.rpc_large_image_url),
            smallImageUrl: normalizeOptionalText(row.rpc_small_image_url),
            buttons: normalizeStoredButtons(
                { label: row.rpc_button_label_1, url: row.rpc_button_url_1 },
                { label: row.rpc_button_label_2, url: row.rpc_button_url_2 }
            )
        }
    };
}

function buildStreamingDescriptor(settings, index) {
    return {
        activityId: 'vc-streaming',
        type: 'STREAMING',
        index,
        title: settings.title,
        details: settings.details,
        // Prefer the clickable button area for streaming activities.
        elapsedSeconds: null,
        largeImageUrl: settings.largeImageUrl,
        smallImageUrl: settings.smallImageUrl,
        buttons: settings.buttons,
        url: pickPrimaryLinkUrl(settings.buttons)
    };
}

function buildRpcDescriptor(settings, index) {
    const hasElapsedTimer = Number.isInteger(settings.elapsedSeconds) && settings.elapsedSeconds >= 0;

    return {
        activityId: 'vc-rpc',
        type: 'PLAYING',
        index,
        title: settings.title,
        details: settings.details,
        elapsedSeconds: settings.elapsedSeconds,
        largeImageUrl: settings.largeImageUrl,
        smallImageUrl: settings.smallImageUrl,
        // When an RPC timer exists, omit buttons so Discord can keep the timer line visible.
        buttons: hasElapsedTimer ? [] : settings.buttons,
        url: null
    };
}

function applyActivityAssets(activity, activitySettings) {
    try {
        if (activitySettings.largeImageUrl) {
            activity.setAssetsLargeImage(activitySettings.largeImageUrl);
        }
    } catch (error) {
        // Ignore invalid image payloads and continue syncing the rest.
    }

    try {
        if (activitySettings.smallImageUrl) {
            activity.setAssetsSmallImage(activitySettings.smallImageUrl);
        }
    } catch (error) {
        // Ignore invalid image payloads and continue syncing the rest.
    }
}

function applyActivityButtons(activity, buttons) {
    if (!Array.isArray(buttons) || buttons.length === 0) {
        return;
    }

    try {
        activity.setButtons(...buttons);
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

function createActivity(client, descriptor) {
    const activity = new RichPresence(client)
        .setName(descriptor.title)
        .setType(descriptor.type);

    assignActivityIdentity(activity, descriptor.activityId, descriptor.index);

    if (DEFAULT_APPLICATION_ID) {
        activity.setApplicationId(DEFAULT_APPLICATION_ID);
    }

    if (descriptor.url) {
        activity.setURL(descriptor.url);
    }

    if (descriptor.details) {
        activity.setDetails(descriptor.details);
    }

    applyElapsedTimestamp(activity, descriptor.elapsedSeconds);
    applyActivityAssets(activity, descriptor);
    applyActivityButtons(activity, descriptor.buttons);

    return activity;
}

function buildActivities(client, settings) {
    const descriptors = [];

    if (settings.streaming.title) {
        descriptors.push(buildStreamingDescriptor(settings.streaming, descriptors.length));
    }

    if (settings.rpc.title) {
        descriptors.push(buildRpcDescriptor(settings.rpc, descriptors.length));
    }

    return descriptors.map(descriptor => createActivity(client, descriptor));
}

function buildSettingsSignature(settings) {
    return JSON.stringify({
        presenceVersion: 11,
        applicationId: DEFAULT_APPLICATION_ID,
        settings
    });
}

async function applyStoredProfileSettings(client, { force = false } = {}) {
    if (!client.user?.id) return;

    const [rows] = await pool.execute(
        `SELECT
            streaming_text,
            streaming_details,
            streaming_elapsed_seconds,
            streaming_button_label,
            streaming_button_url,
            streaming_button_label_2,
            streaming_button_url_2,
            streaming_large_image_url,
            streaming_small_image_url,
            rpc_text,
            rpc_text_1,
            rpc_details_1,
            rpc_elapsed_seconds_1,
            rpc_button_label_1,
            rpc_button_url_1,
            rpc_button_label_2,
            rpc_button_url_2,
            rpc_large_image_url,
            rpc_small_image_url
         FROM user_settings
         WHERE user_id = ?`,
        [client.user.id]
    );

    const settings = normalizeProfileSettings(rows[0] || {});
    const signature = buildSettingsSignature(settings);
    const lastAppliedAt = clientStateAppliedAt.get(client.user.id) || 0;
    const recentlyApplied = (Date.now() - lastAppliedAt) < PRESENCE_REFRESH_WINDOW_MS;

    if (!force && recentlyApplied && clientStates.get(client.user.id) === signature) {
        return;
    }

    const activities = buildActivities(client, settings);

    if (!activities.length) {
        await Promise.resolve(client.user.setPresence({ activities: [] }));
        clientStates.set(client.user.id, signature);
        clientStateAppliedAt.set(client.user.id, Date.now());
        return;
    }

    await Promise.resolve(client.user.setPresence({ activities }));
    clientStates.set(client.user.id, signature);
    clientStateAppliedAt.set(client.user.id, Date.now());
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
        clientStateAppliedAt.delete(client.user.id);
    }
}

module.exports = {
    applyStoredProfileSettings,
    startProfileSync,
    stopProfileSync
};
