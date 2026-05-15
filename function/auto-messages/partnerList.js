const pool = require('../../db');
const { buildTextCard, splitDiscordMessage } = require('../../utils/premiumText');
const { fetchChannel, sendMessage, sendTemporaryMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!파트너 목록보기',
    aliases: ['!파트너 목록 보기'],
    description: '등록한 파트너 채널 목록을 고유 ID, 서버명, 채널명 기준으로 보여줍니다.',
    async execute(message) {
        const [rows] = await pool.execute(
            'SELECT id, channel_id FROM partner_servers WHERE user_id = ? ORDER BY id ASC',
            [message.author.id]
        );

        if (rows.length === 0) {
            return sendTemporaryMessage(message.channel, '등록된 파트너 채널이 없습니다.', 2000);
        }

        const lines = [];
        for (const row of rows) {
            const channel = await fetchChannel(message.client, row.channel_id).catch(() => null);

            if (channel?.guild && channel?.name) {
                lines.push(`고유 ID: \`${row.id}\` | 서버: \`${channel.guild.name}\` | 채널: \`#${channel.name}\``);
            } else {
                lines.push(`고유 ID: \`${row.id}\` | 서버: \`정보 없음\` | 채널: \`삭제되었거나 접근 불가\``);
            }
        }

        const content = buildTextCard({
            accent: 'PARTNER LIST',
            title: '등록된 파트너 채널 목록',
            subtitle: '삭제가 필요하면 `!파트너 삭제 (고유 ID)`를 입력하면 됩니다.',
            sections: [
                {
                    label: 'CHANNELS',
                    lines
                }
            ],
            footer: '채널 ID 대신 서버명과 채널명을 확인할 수 있도록 정리했습니다.'
        });

        for (const chunk of splitDiscordMessage(content)) {
            await sendMessage(message.channel, chunk);
        }
    }
};
