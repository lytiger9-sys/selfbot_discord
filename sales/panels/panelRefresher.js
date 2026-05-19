const { createPanel } = require('./embed/embedBuilders');
const {
    deletePanelMessage,
    fetchPanelMessagesNeedingRefresh,
    markPanelMessageRefreshed,
    savePanelMessage
} = require('./panelMessageStore');

function isMissingResourceError(error) {
    return [10003, 10008, 50001, 50013].includes(Number(error?.code));
}

async function trackPanelMessage(channelId, messageId) {
    if (!channelId || !messageId) {
        return;
    }

    await savePanelMessage(channelId, messageId);
}

async function refreshTrackedPanels(client) {
    const trackedMessages = await fetchPanelMessagesNeedingRefresh();

    for (const tracked of trackedMessages) {
        try {
            const channel = await client.channels.fetch(tracked.channel_id);
            if (!channel?.messages?.fetch) {
                await deletePanelMessage(tracked.message_id);
                continue;
            }

            const message = await channel.messages.fetch(tracked.message_id);
            if (!message) {
                await deletePanelMessage(tracked.message_id);
                continue;
            }

            await message.edit(await createPanel());
            await markPanelMessageRefreshed(tracked.message_id);
        } catch (error) {
            if (isMissingResourceError(error)) {
                await deletePanelMessage(tracked.message_id).catch(() => {});
                continue;
            }

            console.error('[PanelRefresh]', tracked.message_id, error.message);
        }
    }
}

module.exports = {
    refreshTrackedPanels,
    trackPanelMessage
};
