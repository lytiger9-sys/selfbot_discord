const pool = require('../../db');
const { escapeCodeBlock } = require('../../utils/premiumText');
const { sendMessage, sendTemporaryMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!계좌',
    description: '!계좌 : 저장된 계좌를 확인합니다.',
    async execute(message) {
        const [rows] = await pool.execute(
            'SELECT bank_account FROM user_settings WHERE user_id = ? LIMIT 1',
            [message.author.id]
        );

        const bankAccount = String(rows[0]?.bank_account || '').trim();
        if (!bankAccount) {
            return sendTemporaryMessage(
                message.channel,
                '저장된 계좌가 없습니다. `!계좌설정 [계좌]`로 등록하세요.',
                2500
            );
        }

        await sendMessage(message.channel, {
            content: `**저장된 계좌**\n\`${escapeCodeBlock(bankAccount)}\``
        });
    }
};
