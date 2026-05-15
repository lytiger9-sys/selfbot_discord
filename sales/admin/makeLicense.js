const pool = require('../../db');
const { v4: uuidv4 } = require('uuid');
const { sendTemporaryMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!라이센스 생성',
    adminOnly: true,
    description: '지정한 기간 또는 영구 조건으로 라이센스를 여러 개 생성합니다.\n사용 예시: `!라이센스 생성 30 5`, `!라이센스 생성 영구 1`',
    async execute(message, args) {
        const durationStr = args[0];
        const count = Number.parseInt(args[1], 10);

        if (!durationStr || Number.isNaN(count) || count <= 0) {
            return sendTemporaryMessage(message.channel, '사용법: `!라이센스 생성 (기간/영구) (개수)`', 2000);
        }

        let durationDays;
        if (durationStr === '영구') {
            durationDays = 99999;
        } else {
            durationDays = Number.parseInt(durationStr, 10);
            if (Number.isNaN(durationDays) || durationDays <= 0) {
                return sendTemporaryMessage(message.channel, '❌ 기간은 양의 숫자 또는 `영구`여야 합니다.', 2000);
            }
        }

        for (let index = 0; index < count; index += 1) {
            const id = uuidv4().split('-')[0].toUpperCase();
            await pool.execute('INSERT INTO licenses (id, duration_days) VALUES (?, ?)', [id, durationDays]);
        }

        const planLabel = durationStr === '영구' ? '영구 라이센스' : `${durationDays}일권 라이센스`;
        await sendTemporaryMessage(message.channel, `✅ ${planLabel} ${count}개를 생성했습니다.`, 2000);
    }
};
