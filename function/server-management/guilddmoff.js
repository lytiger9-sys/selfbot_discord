const { sendTemporaryMessage } = require('../../utils/commandUtils');
const { setGuildDmBlockEnabled } = require('../../utils/guildDmBlocker');

async function fetchCommandMember(message) {
    return message.member || message.guild.members.fetch(message.author.id).catch(() => null);
}

module.exports = {
    name: '!dm차단',
    description: '현재 서버 멤버가 이 계정에 DM을 보내지 못하도록 서버별 DM 허용 설정을 차단하고 주기적으로 유지합니다.',
    async execute(message) {
        if (!message.guild) {
            return sendTemporaryMessage(message.channel, '이 명령어는 서버에서만 사용할 수 있습니다.', 3000);
        }

        const member = await fetchCommandMember(message);
        if (!member?.permissions?.has('ADMINISTRATOR')) {
            return sendTemporaryMessage(message.channel, '현재 서버에서 관리자 권한이 있어야 사용할 수 있습니다.', 3000);
        }

        try {
            await setGuildDmBlockEnabled(message.client, message.guild.id, true);
            await sendTemporaryMessage(
                message.channel,
                `현재 계정 기준으로 **${message.guild.name}** 서버 멤버의 DM을 차단했고, 주기적으로 다시 적용합니다.`,
                3500
            );
        } catch (error) {
            await sendTemporaryMessage(message.channel, 'DM 차단 설정을 적용하는 중 오류가 발생했습니다.', 3000);
        }
    }
};
