const pool = require('../../db');
const { buildTextCard } = require('../../utils/premiumText');
const { sendTemporaryMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!라이센스 삭제',
    adminOnly: true,
    description: '고유 ID를 입력해 해당 라이센스를 삭제하고 삭제된 항목의 핵심 정보를 보여줍니다.\n사용 예시: `!라이센스 삭제 ABCD1234`',
    async execute(message, args) {
        const id = args[0];

        if (!id) {
            return sendTemporaryMessage(message.channel, '사용법: `!라이센스 삭제 (고유 ID)`', 2000);
        }

        const [rows] = await pool.execute('SELECT * FROM licenses WHERE id = ?', [id]);
        if (rows.length === 0) {
            return sendTemporaryMessage(message.channel, '❌ 해당 ID의 라이센스를 찾을 수 없습니다.', 2000);
        }

        await pool.execute('DELETE FROM licenses WHERE id = ?', [id]);
        const deletedLicense = rows[0];
        const summary = buildTextCard({
            accent: 'LICENSE REMOVED',
            title: '라이센스 삭제 완료',
            subtitle: '요청한 라이센스를 삭제했습니다.',
            sections: [
                {
                    label: 'LICENSE',
                    lines: [
                        `• ID: \`${deletedLicense.id}\``,
                        `• 기간: \`${deletedLicense.duration_days >= 99999 ? '영구' : `${deletedLicense.duration_days}일`}\``,
                        `• 사용자: \`${deletedLicense.user_id || '미사용'}\``
                    ]
                }
            ],
            footer: '삭제 완료 안내는 2초 후 자동으로 정리됩니다.'
        });

        await sendTemporaryMessage(message.channel, summary, 2000);
    }
};
