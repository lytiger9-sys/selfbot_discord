const { sendTemporaryMessage } = require('../../utils/commandUtils');
const { setGuildDmBlockEnabled } = require('../../utils/guildDmBlocker');

async function fetchCommandMember(message) {
    return message.member || message.guild.members.fetch(message.author.id).catch(() => null);
}

module.exports = {
    name: '!dm차단해제',
    description: '현재 서버에 대해 저장된 DM 차단 자동 적용을 해제하고, 이 계정의 서버별 DM 차단 설정도 풀어줍니다.',
    async execute(message) {
        if (!message.guild) {
            return sendTemporaryMessage(message.channel, '이 명령어는 서버에서만 사용할 수 있습니다.', 3000);
        }

        const member = await fetchCommandMember(message);
        if (!member?.permissions?.has('ADMINISTRATOR')) {
            return sendTemporaryMessage(message.channel, '현재 서버에서 관리자 권한이 있어야 사용할 수 있습니다.', 3000);
        }

        try {
            await setGuildDmBlockEnabled(message.client, message.guild.id, false);
            await sendTemporaryMessage(
                message.channel,
                `현재 계정 기준으로 **${message.guild.name}** 서버의 DM 차단 자동 적용을 해제했습니다.`,
                3500
            );
        } catch (error) {
            await sendTemporaryMessage(message.channel, 'DM 차단 해제 설정을 적용하는 중 오류가 발생했습니다.', 3000);
        }
    }
};
