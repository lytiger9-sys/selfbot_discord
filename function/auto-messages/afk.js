const pool = require('../../db');
const { buildTextCard, escapeCodeBlock } = require('../../utils/premiumText');
const { sendMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!afk',
    description: '현재 AFK 활성 상태와 저장된 자동응답 메시지를 불러옵니다.',
    async execute(message) {
        const userId = message.author.id;
        const [rows] = await pool.execute(
            'SELECT afk_enabled, afk_message FROM user_settings WHERE user_id = ?',
            [userId]
        );

        const isEnabled = Boolean(rows[0]?.afk_enabled);
        const afkMessage = rows[0]?.afk_message || '설정된 메시지가 없습니다.';
        const content = buildTextCard({
            accent: 'AFK STATUS',
            title: '자리비움 상태 조회',
            subtitle: '현재 설정된 AFK 상태와 자동응답 문구입니다.',
            sections: [
                {
                    label: 'STATUS',
                    lines: [
                        `• AFK 상태: ${isEnabled ? '`ON / 작동 중`' : '`OFF / 비활성`'}`,
                        '• 설정 명령: `!afk설정`, `!afkon`, `!afkoff`'
                    ]
                },
                {
                    label: 'MESSAGE PREVIEW',
                    lines: [
                        `\`\`\`\n${escapeCodeBlock(afkMessage)}\n\`\`\``
                    ]
                }
            ],
            footer: '상태 조회 메시지는 확인용으로 유지됩니다.'
        });

        await sendMessage(message.channel, content);
    }
};
