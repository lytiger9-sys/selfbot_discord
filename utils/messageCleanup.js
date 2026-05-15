const {
    deleteMessage,
    fetchMessages,
    isTextCommandChannel
} = require('./commandUtils');

function snowflakeToBigInt(value) {
    try {
        return value ? BigInt(value) : 0n;
    } catch (error) {
        return 0n;
    }
}

function normalizeChannelList(channels) {
    return [...channels]
        .map(item => {
            if (Array.isArray(item) && item.length >= 2) {
                return item[1];
            }

            return item;
        })
        .filter(Boolean);
}

function sortChannelsByActivity(channels) {
    return normalizeChannelList(channels).sort((left, right) => {
        const leftId = snowflakeToBigInt(left.lastMessageId);
        const rightId = snowflakeToBigInt(right.lastMessageId);

        if (leftId === rightId) {
            return String(left.name || left.id).localeCompare(String(right.name || right.id), 'ko');
        }

        return leftId > rightId ? -1 : 1;
    });
}

async function collectOwnMessages(channel, userId, targetCount, ignoredIds = new Set()) {
    const collected = [];
    let before;

    while (collected.length < targetCount) {
        const batch = await fetchMessages(channel, {
            limit: Math.min(100, Math.max(20, targetCount)),
            ...(before ? { before } : {})
        }).catch(() => null);

        if (!batch?.size) break;

        for (const message of batch.values()) {
            if (message.author.id !== userId) continue;
            if (ignoredIds.has(message.id)) continue;

            collected.push(message);
            if (collected.length >= targetCount) break;
        }

        before = batch.last()?.id;
        if (!before || batch.size < Math.min(100, Math.max(20, targetCount))) break;
    }

    return collected.slice(0, targetCount);
}

async function collectRecentOwnMessagesFromChannels(channels, userId, targetCount, ignoredIds = new Set()) {
    const candidates = [];

    for (const channel of sortChannelsByActivity(channels).filter(isTextCommandChannel)) {
        if (candidates.length >= targetCount * 3 && targetCount > 0) break;

        try {
            const ownMessages = await collectOwnMessages(channel, userId, Math.min(targetCount + ignoredIds.size, 100), ignoredIds);
            candidates.push(...ownMessages);
        } catch (error) {
            continue;
        }
    }

    candidates.sort((left, right) => right.createdTimestamp - left.createdTimestamp);
    return candidates.slice(0, targetCount);
}

async function deleteMessagesSequential(messages) {
    let deletedCount = 0;

    for (const message of messages) {
        const deleted = await deleteMessage(message);
        if (deleted) deletedCount += 1;
    }

    return deletedCount;
}

module.exports = {
    collectOwnMessages,
    collectRecentOwnMessagesFromChannels,
    deleteMessagesSequential,
    sortChannelsByActivity
};
