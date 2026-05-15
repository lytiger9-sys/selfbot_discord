const pool = require('../../db');
const { sendTemporaryMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!afkoff',
    description: 'AFK 자동응답을 끄고 일반 상태로 복귀합니다.',
    async execute(message) {
        await pool.execute(
            'INSERT INTO user_settings (user_id, afk_enabled) VALUES (?, FALSE) ON DUPLICATE KEY UPDATE afk_enabled = FALSE',
            [message.author.id]
        );

        await sendTemporaryMessage(message.channel, '✅ AFK 자동응답을 비활성화했습니다.', 2000);
    }
};
