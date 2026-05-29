const pool = require('../../../db');
const { sendTemporaryMessage } = require('../../../utils/commandUtils');

module.exports = {
    name: '!파트너 삭제',
    description: '고유 ID를 이용해 등록된 파트너 채널을 빠르게 삭제합니다.\n사용 예시: `!파트너 삭제 12`',
    async execute(message, args) {
        const partnerId = Number.parseInt(args[0], 10);

        if (Number.isNaN(partnerId)) {
            return sendTemporaryMessage(message.channel, '사용법: `!파트너 삭제 (고유 ID)`', 2000);
        }

        const [result] = await pool.execute(
            'DELETE FROM partner_servers WHERE id = ? AND user_id = ?',
            [partnerId, message.author.id]
        );

        if (!result.affectedRows) {
            return sendTemporaryMessage(message.channel, '❌ 해당 고유 ID의 파트너 채널을 찾지 못했습니다.', 2000);
        }

        await sendTemporaryMessage(message.channel, `✅ 파트너 채널 고유 ID ${partnerId} 항목을 삭제했습니다.`, 2000);
    }
};
