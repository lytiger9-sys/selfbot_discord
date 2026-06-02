const { sendTemporaryMessage } = require('../../utils/commandUtils');
const { sendChannelWebhookMessage } = require('../../utils/webhookUtils');

const USAGE = '!웹훅 [메시지]';

module.exports = {
    name: '!웹훅',
    aliases: ['!webhook'],
    description:
        '!웹훅 [메시지]: 해당 메시지를 채널 수정 권한이 있다면 웹훅을 생성하여 보냅니다.\n'
        + '이 채널에 이미 내가 만든 웹훅이 있으면 재사용하고, 없으면 권한이 있을 때 새로 만듭니다.\n'
        + '채널별로 저장한 이름과 프로필 사진을 적용합니다.',
    async execute(message, args, rawArgs) {
        if (!message.guild) {
            return sendTemporaryMessage(
                message.channel,
                '웹훅은 시스템 채널에서만 사용할 수 있습니다.',
                2500
            );
        }

        const content = String(rawArgs || '').trim();
        if (!content) {
            return sendTemporaryMessage(message.channel, `사용법: \`${USAGE}\``, 2500);
        }

        try {
            await sendChannelWebhookMessage(message, content);
        } catch (error) {
            const reasonMap = {
                MISSING_WEBHOOK_PERMISSION: '이 채널에서 웹훅을 생성할 권한이 없습니다.',
                UNSUPPORTED_CHANNEL: '이 채널에서는 웹훅을 사용할 수 없습니다.',
                WEBHOOK_TOKEN_UNAVAILABLE: '기존 웹훅 토큰을 불러오지 못했습니다. 웹훅을 새로 만들어 주세요.'
            };

            await sendTemporaryMessage(
                message.channel,
                reasonMap[error.code] || '웹훅 메시지를 보내는 중 오류가 발생했습니다.',
                2500
            );
        }
    }
};
