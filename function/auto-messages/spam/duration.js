const { delay, sendMessage } = require('../../../utils/commandUtils');
const { createSpamJob } = require('../../../utils/spamAutomation');

function startDurationSpam(channel, content, durationSeconds, onError) {
    const stopAt = Date.now() + Math.max(1, durationSeconds) * 1000;
    const job = createSpamJob(channel.client);

    void (async () => {
        try {
            while (!job.signal.aborted && Date.now() < stopAt) {
                await sendMessage(channel, content, job.signal);

                if (job.signal.aborted) {
                    break;
                }

                const waitMs = Math.min(1000, stopAt - Date.now());
                if (waitMs <= 0) {
                    break;
                }

                await delay(waitMs, job.signal);
            }
        } catch (error) {
            if (!job.signal.aborted) {
                throw error;
            }
        } finally {
            job.release();
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
