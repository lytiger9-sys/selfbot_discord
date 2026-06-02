const { createPanel } = require('./panelLayoutV2');
const { editPanelMessage } = require('./panelDiscordApi');
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

async function refreshTrackedPanels() {
    const trackedMessages = await fetchPanelMessagesNeedingRefresh();

    for (const tracked of trackedMessages) {
        try {
            await editPanelMessage(tracked.channel_id, tracked.message_id, await createPanel());
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
