const pool = require('../../../db');
const { fetchMessages, sendTemporaryMessage } = require('../../../utils/commandUtils');

module.exports = {
    name: '!파트너 메시지설정',
    aliases: ['!파트너 메시지 설정'],
    description: '현재 채널에서 내가 마지막으로 보낸 일반 메시지를 파트너 홍보 문구로 저장합니다.',
    async execute(message) {
        const messages = await fetchMessages(message.channel, { limit: 25 }).catch(() => null);
        const lastMessage = messages
            ? [...messages.values()].find(item =>
                item.id !== message.id
                && item.author.id === message.client.user.id
                && item.content?.trim()
            )
            : null;

        if (!lastMessage) {
            return sendTemporaryMessage(message.channel, '본인이 직전에 보낸 저장 가능한 메시지를 찾지 못했습니다.', 2000);
        }

        await pool.execute(
            'INSERT INTO user_settings (user_id, partner_message) VALUES (?, ?) ON DUPLICATE KEY UPDATE partner_message = VALUES(partner_message)',
            [message.author.id, lastMessage.content]
        );

        await sendTemporaryMessage(message.channel, '직전 메시지를 파트너 홍보 문구로 저장했습니다.', 2000);
    }
};
