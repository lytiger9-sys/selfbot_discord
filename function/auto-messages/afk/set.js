const pool = require('../../../db');
const { sendTemporaryMessage } = require('../../../utils/commandUtils');

module.exports = {
    name: '!afk설정',
    aliases: ['!afk 설정'],
    description: 'AFK 자동응답 메시지를 설정합니다.\n사용 예시: `!afk 설정 지금은 자리를 비웠습니다.`',
    async execute(message, args, rawArgs) {
        const afkMessage = rawArgs.trim();

        if (!afkMessage) {
            return sendTemporaryMessage(message.channel, '사용법: `!afk 설정 (메시지)`', 2000);
        }

        await pool.execute(
            'INSERT INTO user_settings (user_id, afk_message) VALUES (?, ?) ON DUPLICATE KEY UPDATE afk_message = VALUES(afk_message)',
            [message.author.id, afkMessage]
        );

        await sendTemporaryMessage(message.channel, 'AFK 자동응답 메시지를 저장했습니다.', 2000);
    }
};
