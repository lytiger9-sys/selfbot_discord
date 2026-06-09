const pool = require('../../db');
const { escapeCodeBlock } = require('../../utils/premiumText');
const { sendMessage, sendTemporaryMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!계좌설정',
    description: '!계좌설정 [계좌] : 내 계좌를 저장합니다.',
    async execute(message, args, rawArgs) {
        const bankAccount = String(rawArgs || '').trim();
        if (!bankAccount) {
            return sendTemporaryMessage(
                message.channel,
                '사용법: `!계좌설정 [계좌]`',
                2500
            );
        }

        await pool.execute(
            `INSERT INTO user_settings (user_id, bank_account)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE bank_account = VALUES(bank_account)`,
            [message.author.id, bankAccount]
        );

        await sendMessage(message.channel, {
            content: `**계좌가 저장되었습니다.**\n\`${escapeCodeBlock(bankAccount)}\``
        });
    }
};
