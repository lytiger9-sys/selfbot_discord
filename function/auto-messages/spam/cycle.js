const { delay, sendMessage } = require('../../../utils/commandUtils');

function startCycleSpam(channel, content, intervalMinutes, onError) {
    const intervalMs = Math.max(1, Math.round(intervalMinutes * 60 * 1000));

    void (async () => {
        await sendMessage(channel, content);

        while (true) {
            await delay(intervalMs);
            await sendMessage(channel, content);
        }
    })().catch(error => {
        console.error('[SpamCycle]', error?.message || error);
        if (typeof onError === 'function') {
            onError(error);
        }
    });
}

module.exports = {
    startCycleSpam
};
