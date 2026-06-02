const { Permissions } = require('discord.js-selfbot-v13');

const channelWebhookState = new Map();

function normalizeText(value) {
    const text = String(value || '').trim();
    return text || null;
}

function getOrCreateChannelState(channelId) {
    const key = String(channelId || '').trim();
    if (!key) {
        return null;
    }

    if (!channelWebhookState.has(key)) {
        channelWebhookState.set(key, {
            avatar_url: null,
            channel_id: key,
            webhook_id: null,
            webhook_name: null,
            webhook_token: null
        });
    }

    return channelWebhookState.get(key);
}

function patchChannelState(channelId, patch) {
    const state = getOrCreateChannelState(channelId);
    if (!state) {
        return null;
    }

    Object.assign(state, patch, { channel_id: state.channel_id });
    return state;
}

function getChannelWebhookProfile(channelId) {
    const state = channelWebhookState.get(String(channelId || '').trim());
    return state ? { ...state } : null;
}

function setChannelWebhookProfile(channelId, avatarUrl) {
    return patchChannelState(channelId, {
        avatar_url: normalizeText(avatarUrl)
    });
}

function setChannelWebhookName(channelId, webhookName) {
    return patchChannelState(channelId, {
        webhook_name: normalizeText(webhookName)
    });
}

function hasWebhookPermission(channel, clientUser) {
    const currentMember = channel.guild?.members?.me
        || channel.guild?.members?.cache?.get(clientUser.id)
        || clientUser;
    const permissions = channel.permissionsFor?.(currentMember);
    return Boolean(permissions?.has(Permissions.FLAGS.MANAGE_WEBHOOKS, false));
}

function createWebhookError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
}

function isMissingWebhookPermissionError(error) {
    const code = error?.code;
    const message = String(error?.message || '');
    return code === 50013 || code === 'MISSING_PERMISSIONS' || /Missing Permissions/i.test(message);
}

function rememberWebhookHandle(channelId, webhook) {
    if (!webhook?.id) {
        return null;
    }

    const state = getOrCreateChannelState(channelId);
    if (!state) {
        return null;
    }

    state.webhook_id = webhook.id;
    if (webhook.token) {
        state.webhook_token = webhook.token;
    }

    return state;
}

async function fetchOwnedWebhook(channel, clientUser) {
    if (!channel || typeof channel.fetchWebhooks !== 'function') {
        throw createWebhookError('UNSUPPORTED_CHANNEL');
    }

    const channelId = channel.id;
    const cached = channelWebhookState.get(channelId);

    if (cached?.webhook_id && cached?.webhook_token && typeof channel.client?.fetchWebhook === 'function') {
        try {
            const cachedWebhook = await channel.client.fetchWebhook(cached.webhook_id, cached.webhook_token);
            rememberWebhookHandle(channelId, cachedWebhook);
            return cachedWebhook;
        } catch (error) {
            if (isMissingWebhookPermissionError(error)) {
                throw createWebhookError('MISSING_WEBHOOK_PERMISSION');
            }
        }
    }

    let webhooks;
    try {
        webhooks = await channel.fetchWebhooks();
    } catch (error) {
        if (isMissingWebhookPermissionError(error)) {
            throw createWebhookError('MISSING_WEBHOOK_PERMISSION');
        }

        throw error;
    }

    const ownedWebhook = [...webhooks.values()].find(webhook => webhook?.owner?.id === clientUser.id) || null;
    if (!ownedWebhook) {
        return null;
    }

    rememberWebhookHandle(channelId, ownedWebhook);
    return ownedWebhook.token ? ownedWebhook : null;
}

async function resolveOwnedWebhook(channel, clientUser, preferredName = null) {
    if (!channel || typeof channel.createWebhook !== 'function') {
        throw createWebhookError('UNSUPPORTED_CHANNEL');
    }

    const ownedWebhook = await fetchOwnedWebhook(channel, clientUser);
    if (ownedWebhook) {
        return ownedWebhook;
    }

    if (!hasWebhookPermission(channel, clientUser)) {
        throw createWebhookError('MISSING_WEBHOOK_PERMISSION');
    }

    const state = getOrCreateChannelState(channel.id) || {};
    const resolvedName = normalizeText(preferredName) || state.webhook_name || clientUser.username;

    try {
        const createdWebhook = await channel.createWebhook(resolvedName, {
            avatar: state.avatar_url || undefined,
            reason: '웹훅 메시지 전송'
        });
        rememberWebhookHandle(channel.id, createdWebhook);
        return createdWebhook;
    } catch (error) {
        if (isMissingWebhookPermissionError(error)) {
            throw createWebhookError('MISSING_WEBHOOK_PERMISSION');
        }

        throw error;
    }
}

async function sendChannelWebhookMessage(message, content) {
    const state = getOrCreateChannelState(message.channel.id) || {};
    let webhook = await resolveOwnedWebhook(
        message.channel,
        message.client.user,
        state.webhook_name || message.client.user.username
    );

    if ((state.webhook_name || state.avatar_url) && typeof webhook.edit === 'function') {
        try {
            webhook = await webhook.edit({
                name: state.webhook_name || webhook.name,
                avatar: state.avatar_url || undefined
            });
            rememberWebhookHandle(message.channel.id, webhook);
        } catch (error) {
            if (!isMissingWebhookPermissionError(error)) {
                // Ignore avatar/name update failures and continue sending.
            }
        }
    }

    const webhookAvatar = typeof webhook.avatarURL === 'function'
        ? webhook.avatarURL({ size: 256, format: 'png' })
        : null;
    const resolvedName = state.webhook_name || webhook.name || message.client.user.username;
    const resolvedAvatar = state.avatar_url || webhookAvatar || message.client.user.displayAvatarURL({ dynamic: true, size: 256 });

    return webhook.send({
        content,
        avatarURL: resolvedAvatar,
        username: resolvedName
    });
}

module.exports = {
    getChannelWebhookProfile,
    resolveOwnedWebhook,
    sendChannelWebhookMessage,
    setChannelWebhookName,
    setChannelWebhookProfile
};
