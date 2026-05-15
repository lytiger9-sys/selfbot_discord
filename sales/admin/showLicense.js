const pool = require('../../db');
const { buildTextCard, createTextAttachment, formatDateTime } = require('../../utils/premiumText');
const { sendMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!라이센스 현황',
    adminOnly: true,
    description: '현재까지 저장된 전체 라이센스 목록을 텍스트 보고서 파일로 첨부합니다.',
    async execute(message) {
        const [rows] = await pool.execute('SELECT * FROM licenses');
        const body = rows.length > 0
            ? rows.map((row, index) => {
                const plan = row.duration_days >= 99999 ? '영구' : `${row.duration_days}일`;
                const status = row.is_used ? '사용 중' : '미사용';

                return [
                    `${String(index + 1).padStart(3, '0')}. ${row.user_id || '미사용 유저'}`,
                    `   KEY     : ${row.id}`,
                    `   PLAN    : ${plan}`,
                    `   STATUS  : ${status}`,
                    `   START   : ${formatDateTime(row.start_date, '미기록')}`,
                    `   EXPIRES : ${formatDateTime(row.expiry_date, '미사용')}`
                ].join('\n');
            }).join('\n\n')
            : '등록된 라이센스가 없습니다.';

        const report = [
            'VeloxCorelabs PREMIUM LICENSE LEDGER',
            `Generated: ${formatDateTime(new Date())}`,
            '============================================================',
            body,
            '============================================================',
            `Total Licenses: ${rows.length}`
        ].join('\n');

        const summary = buildTextCard({
            accent: 'LICENSE LEDGER',
            title: '라이센스 현황 보고서',
            subtitle: `총 ${rows.length}개의 라이센스를 텍스트 리포트로 정리했습니다.`,
            sections: [
                {
                    label: 'REPORT STATUS',
                    lines: [
                        '• 상세 목록은 첨부된 텍스트 파일에서 확인할 수 있습니다.',
                        '• 별도 임시 파일 없이 메모리에서 바로 생성됩니다.'
                    ]
                }
            ],
            footer: '대량 목록 확인용 명령이므로 결과 메시지는 유지됩니다.'
        });

        await sendMessage(message.channel, {
            content: summary,
            files: [createTextAttachment('VC-license-ledger.txt', report)]
        });
    }
};
