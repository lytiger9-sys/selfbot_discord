const { delay, sendMessage } = require('../../../utils/commandUtils');

function startDurationSpam(channel, content, durationSeconds, onError) {
    const stopAt = Date.now() + Math.max(1, durationSeconds) * 1000;

    void (async () => {
        while (Date.now() < stopAt) {
            await sendMessage(channel, content);

            const waitMs = Math.min(1000, stopAt - Date.now());
            if (waitMs <= 0) {
                break;
            }

            await delay(waitMs);
        }
    })().catch(error => {
        console.error('[SpamDuration]', error?.message || error);
        if (typeof onError === 'function') {
            onError(error);
        }
    });
}

module.exports = {
    startDurationSpam
};
