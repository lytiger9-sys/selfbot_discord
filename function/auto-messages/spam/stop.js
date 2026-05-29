const { sendTemporaryMessage } = require('../../../utils/commandUtils');
const { stopSpamJobs } = require('../../../utils/spamAutomation');

module.exports = {
    name: '!도배 중지',
    description: '현재 진행 중인 도배를 모두 중지합니다.',
    async execute(message) {
        const stoppedCount = stopSpamJobs(message.client);

        if (stoppedCount <= 0) {
            return sendTemporaryMessage(message.channel, '중지할 도배가 없습니다.', 2500);
        }

        await sendTemporaryMessage(
            message.channel,
            `진행 중인 도배 ${stoppedCount}개를 중지했습니다.`,
            2500
        );
    }
};
