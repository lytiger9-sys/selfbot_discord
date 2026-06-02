const { sendTemporaryMessage } = require('../../utils/commandUtils');
const { setChannelWebhookProfile } = require('../../utils/webhookUtils');

const USAGE = '!웹훅 프로필 [사진링크]';

module.exports = {
    name: '!웹훅 프로필',
    aliases: ['!webhook profile'],
    description:
        '!웹훅 프로필 [사진링크]: 웹훅으로 보낼 메시지의 프로필 사진을 설정합니다.\n'
        + '채널별로 따로 적용됩니다.',
    async execute(message, args, rawArgs) {
        if (!message.guild) {
            return sendTemporaryMessage(
                message.channel,
                '웹훅 프로필은 시스템 채널에서만 설정할 수 있습니다.',
                2500
            );
        }

        const avatarUrl = String(rawArgs || '').trim();
        if (!avatarUrl) {
            return sendTemporaryMessage(message.channel, `사용법: \`${USAGE}\``, 2500);
        }

        await setChannelWebhookProfile(message.channel.id, avatarUrl);

        await sendTemporaryMessage(
            message.channel,
            '이 채널에 설정한 웹훅 프로필 사진을 저장했습니다.\n다음 웹훅 메시지부터 적용됩니다.',
            2500
        );
    }
};
