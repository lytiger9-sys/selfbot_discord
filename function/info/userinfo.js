const { buildTextCard } = require('../../utils/premiumText');
const { sendMessage, sendTemporaryMessage } = require('../../utils/commandUtils');
const { formatDateTime } = require('../../utils/dateTime');

module.exports = {
    name: '!정보',
    description: '계정 또는 입력한 디스코드 ID 대상의 기본 프로필 정보를 보여줍니다.\n사용 예시: `!정보` 또는 `!정보 123456789012345678`',
    async execute(message, args) {
        const targetId = args[0] || message.author.id;

        try {
            const user = await message.client.users.fetch(targetId);
            const member = message.guild
                ? await message.guild.members.fetch(targetId).catch(() => message.guild.members.cache.get(targetId) || null)
                : null;

            const content = buildTextCard({
                accent: 'USER PROFILE',
                title: `${user.tag} 프로필`,
                subtitle: targetId === message.author.id
                    ? '현재 계정의 기본 프로필 정보를 정리했습니다.'
                    : '입력한 디스코드 ID 대상의 기본 프로필 정보를 정리했습니다.',
                sections: [
                    {
                        label: 'IDENTITY',
                        lines: [
                            `• 유저 ID: \`${user.id}\``,
                            `• 계정 유형: \`${user.bot ? 'BOT ACCOUNT' : 'USER ACCOUNT'}\``
                        ]
                    },
                    {
                        label: 'TIMELINE',
                        lines: [
                            `• 디스코드 가입일: \`${formatDateTime(user.createdAt)}\``,
                            `• 현재 서버 참여일: \`${formatDateTime(member?.joinedAt)}\``
                        ]
                    },
                    {
                        label: 'LINKS',
                        lines: [
                            `• 프로필 이미지: ${user.displayAvatarURL({ dynamic: true, size: 512 })}`
                        ]
                    }
                ],
                footer: 'IP 주소 등 민감한 정보는 제공하지 않습니다.'
            });

            await sendMessage(message.channel, content);
        } catch (error) {
            await sendTemporaryMessage(message.channel, '해당 ID의 유저 정보를 불러오지 못했습니다.', 2000);
        }
    }
};
