const { delay, sendMessage } = require('../../../utils/commandUtils');
const { createSpamJob } = require('../../../utils/spamAutomation');

function startCountSpam(channel, content, repeatCount, onError) {
    const totalCount = Math.max(1, Math.trunc(repeatCount));
    const job = createSpamJob(channel.client);

    void (async () => {
        try {
            for (let sentCount = 0; sentCount < totalCount && !job.signal.aborted; sentCount += 1) {
                await sendMessage(channel, content, job.signal);

                if (job.signal.aborted || sentCount >= totalCount - 1) {
                    break;
                }

                await delay(1000, job.signal);
            }
        } catch (error) {
            if (!job.signal.aborted) {
                throw error;
            }
        } finally {
            job.release();
        }
    })().catch(error => {
        console.error('[SpamCount]', error?.message || error);
        if (typeof onError === 'function') {
            onError(error);
        }
    });
}

module.exports = {
    startCountSpam
};
