const { delay, sendMessage } = require('../../../utils/commandUtils');
const { createSpamJob } = require('../../../utils/spamAutomation');

function startCycleSpam(channel, content, intervalMinutes, onError) {
    const intervalMs = Math.max(1, Math.round(intervalMinutes * 60 * 1000));
    const job = createSpamJob(channel.client);

    void (async () => {
        try {
            while (!job.signal.aborted) {
                await sendMessage(channel, content, job.signal);

                if (job.signal.aborted) {
                    break;
                }

                await delay(intervalMs, job.signal);
            }
        } catch (error) {
            if (!job.signal.aborted) {
                throw error;
            }
        } finally {
            job.release();
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
