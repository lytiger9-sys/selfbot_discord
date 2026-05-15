const pool = require('../../db');
const { sendTemporaryMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!afkon',
    description: '저장된 AFK 메시지를 사용하도록 AFK 자동응답을 켭니다.',
    async execute(message) {
        await pool.execute(
            'INSERT INTO user_settings (user_id, afk_enabled) VALUES (?, TRUE) ON DUPLICATE KEY UPDATE afk_enabled = TRUE',
            [message.author.id]
        );

        await sendTemporaryMessage(message.channel, '✅ AFK 자동응답을 활성화했습니다.', 2000);
    }
};
