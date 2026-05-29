const pool = require('../../../db');
const {
    fetchChannel,
    isTextCommandChannel,
    sendTemporaryMessage
} = require('../../../utils/commandUtils');

module.exports = {
    name: '!파트너 서버설정',
    aliases: ['!파트너 서버 설정'],
    description: '파트너 홍보를 보낼 채널 ID를 등록합니다.\n사용 예시: `!파트너 서버 설정 123456789012345678`',
    async execute(message, args) {
        const channelId = args[0];

        if (!channelId) {
            return sendTemporaryMessage(message.channel, '사용법: `!파트너 서버 설정 (채널 ID)`', 2000);
        }

        const channel = await fetchChannel(message.client, channelId).catch(() => null);
        if (!channel || !isTextCommandChannel(channel) || !channel.guild) {
            return sendTemporaryMessage(message.channel, '유효한 서버 텍스트 채널 ID가 아닙니다.', 2000);
        }

        const [existing] = await pool.execute(
            'SELECT id FROM partner_servers WHERE user_id = ? AND channel_id = ?',
            [message.author.id, channelId]
        );

        if (existing.length > 0) {
            return sendTemporaryMessage(message.channel, '이미 등록된 채널입니다.', 2000);
        }

        await pool.execute(
            'INSERT INTO partner_servers (user_id, channel_id) VALUES (?, ?)',
            [message.author.id, channelId]
        );

        await sendTemporaryMessage(
            message.channel,
            `${channel.guild.name} / #${channel.name} 채널을 파트너 목록에 등록했습니다.`,
            2000
        );
    }
};
