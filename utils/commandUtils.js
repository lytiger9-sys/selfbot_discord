const { isMasterUser } = require('./adminStore');

function delay(ms, signal = null) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            const error = new Error('The operation was aborted.');
            error.name = 'AbortError';
            reject(error);
            return;
        }

        const timeoutId = setTimeout(() => {
            cleanup();
            resolve();
        }, ms);

        const cleanup = () => {
            clearTimeout(timeoutId);
            if (signal) {
                signal.removeEventListener('abort', onAbort);
            }
        };

        const onAbort = () => {
            cleanup();
            const error = new Error('The operation was aborted.');
            error.name = 'AbortError';
            reject(error);
        };

        if (signal) {
            signal.addEventListener('abort', onAbort, { once: true });
        }
    });
}

const fallbackQueueKey = {};
const queueStates = new WeakMap();

function normalizePayload(payload) {
    if (typeof payload === 'string') {
        return { content: payload };
    }

    return payload || {};
}

function resolveQueueKey(scope) {
    if (!scope || typeof scope !== 'object') {
        return fallbackQueueKey;
    }

    if (scope.channels && scope.users && scope.ws) {
        return scope;
    }

    if (scope.client && typeof scope.client === 'object') {
        return scope.client;
    }

    if (scope.channel?.client && typeof scope.channel.client === 'object') {
        return scope.channel.client;
    }

    return fallbackQueueKey;
}

function getQueueState(scope) {
    const key = resolveQueueKey(scope);

    if (!queueStates.has(key)) {
        queueStates.set(key, {
            nextAvailableAt: 0,
            queue: Promise.resolve()
        });
    }

    return queueStates.get(key);
}

function runDiscordAction(action, spacingMs = 200, scope = null, signal = null) {
    const state = getQueueState(scope);
    const task = async () => {
        if (signal?.aborted) {
            return null;
        }

        const now = Date.now();
        const waitMs = Math.max(0, state.nextAvailableAt - now);

        if (waitMs > 0) {
            await delay(waitMs, signal);
        }

        if (signal?.aborted) {
            return null;
        }

        state.nextAvailableAt = Date.now() + spacingMs;
        if (signal?.aborted) {
            return null;
        }

        return action();
    };

    const pending = state.queue.then(task, task);
    state.queue = pending.catch(() => undefined);
    return pending.catch(error => {
        if (error?.name === 'AbortError') {
            return null;
        }

        throw error;
    });
}

async function sendMessage(channel, payload, signal = null) {
    return runDiscordAction(() => channel.send(normalizePayload(payload)), 200, channel, signal);
}

async function replyMessage(message, payload, signal = null) {
    return runDiscordAction(() => message.reply(normalizePayload(payload)), 200, message, signal);
}

async function deleteMessage(target) {
    if (!target || typeof target.delete !== 'function') return null;
    return runDiscordAction(async () => {
        try {
            await target.delete();
            return true;
        } catch (error) {
            return false;
        }
    }, 200, target);
}

function scheduleDeletion(target, ttlMs = 2000) {
    if (!target || ttlMs <= 0) return target;

    setTimeout(() => {
        deleteMessage(target).catch(() => {});
    }, ttlMs);

    return target;
}

async function sendTemporaryMessage(channel, payload, ttlMs = 2000) {
    const sent = await sendMessage(channel, payload);
    scheduleDeletion(sent, ttlMs);
    return sent;
}

async function replyTemporaryMessage(message, payload, ttlMs = 2000) {
    try {
        const sent = await replyMessage(message, payload);
        scheduleDeletion(sent, ttlMs);
        return sent;
    } catch (error) {
        const sent = await sendMessage(message.channel, payload);
        scheduleDeletion(sent, ttlMs);
        return sent;
    }
}

function isTextCommandChannel(channel) {
    return Boolean(
        channel
        && typeof channel.send === 'function'
        && channel.messages
        && typeof channel.messages.fetch === 'function'
    );
}

async function fetchChannel(client, channelId) {
    return runDiscordAction(() => client.channels.fetch(channelId), 200, client);
}

async function fetchMessages(channel, options) {
    return runDiscordAction(() => channel.messages.fetch(options), 200, channel);
}

module.exports = {
    delay,
    deleteMessage,
    fetchChannel,
    fetchMessages,
    isMasterUser,
    isTextCommandChannel,
    replyMessage,
    replyTemporaryMessage,
    runDiscordAction,
    scheduleDeletion,
    sendMessage,
    sendTemporaryMessage
};
