const { buildTextCard } = require('../../../utils/premiumText');
const { sendMessage } = require('../../../utils/commandUtils');
const { formatDateTime, getPartnerOverview } = require('../../../utils/partnerAutomation');

module.exports = {
    name: '!파트너',
    description: '파트너 자동 전송 관련 명령어 목록과 마지막 전송 시각을 보여줍니다.',
    async execute(message) {
        const overview = await getPartnerOverview(message.author.id);

        const content = buildTextCard({
            accent: 'PARTNER SUITE',
            title: '파트너 자동 전송 안내',
            subtitle: '자동 전송은 사용자별로 분리되어 동작하며 다른 유저 데이터와 섞이지 않습니다.',
            sections: [
                {
                    label: 'STATUS',
                    lines: [
                        `• 자동 전송 상태: \`${overview.enabled ? 'ON / 활성화' : 'OFF / 비활성'}\``,
                        `• 등록 채널 수: \`${overview.channelCount}개\``,
                        `• 파트너 문구 저장 여부: \`${overview.hasMessage ? '저장됨' : '미저장'}\``,
                        `• 마지막 전송 시각: \`${formatDateTime(overview.lastSentAt, '전송 기록 없음')}\``
                    ]
                },
                {
                    label: 'COMMANDS',
                    lines: [
                        '• `!파트너 메시지설정` : 내 직전 메시지를 파트너 홍보 문구로 저장',
                        '• `!파트너 서버설정 (채널ID)` : 자동 전송 대상 채널 등록',
                        '• `!파트너 목록보기` : 고유 ID, 서버명, 채널명 확인',
                        '• `!파트너 삭제 (고유ID)` : 등록 채널 삭제',
                        '• `!파트너 전송` : 즉시 1회 전송하고 이후 매일 1회 자동 전송 시작',
                        '• `!파트너 중지` : 자동 전송 중지'
                    ]
                }
            ],
            footer: '자동 전송은 각 셀프봇 사용자 계정 기준으로 독립 동작합니다.'
        });

        await sendMessage(message.channel, content);
    }
};
