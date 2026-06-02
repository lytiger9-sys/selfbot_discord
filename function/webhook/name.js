const { sendTemporaryMessage } = require('../../utils/commandUtils');
const { setChannelWebhookName } = require('../../utils/webhookUtils');

const USAGE = '!웹훅 이름설정 [이름]';
const MAX_WEBHOOK_NAME_LENGTH = 80;

module.exports = {
    name: '!웹훅 이름설정',
    aliases: ['!webhook name'],
    description:
        '!웹훅 이름설정 [이름]: 웹훅 이름을 설정합니다.\n'
        + '채널별로 따로 적용됩니다.',
    async execute(message, args, rawArgs) {
        if (!message.guild) {
            return sendTemporaryMessage(
                message.channel,
                '웹훅 이름 설정은 시스템 채널에서만 사용할 수 있습니다.',
                2500
            );
        }

        const webhookName = String(rawArgs || '').trim();
        if (!webhookName) {
            return sendTemporaryMessage(message.channel, `사용법: \`${USAGE}\``, 2500);
        }

        if (webhookName.length > MAX_WEBHOOK_NAME_LENGTH) {
            return sendTemporaryMessage(
                message.channel,
                `웹훅 이름은 ${MAX_WEBHOOK_NAME_LENGTH}자 이하로 입력해 주세요.`,
                2500
            );
        }

        await setChannelWebhookName(message.channel.id, webhookName);

        await sendTemporaryMessage(
            message.channel,
            '이 채널에 설정한 웹훅 이름을 저장했습니다.\n다음 웹훅 메시지부터 적용됩니다.',
            2500
        );
    }
};
