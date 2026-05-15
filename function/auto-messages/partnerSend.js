const { sendTemporaryMessage } = require('../../utils/commandUtils');
const { broadcastPartnerMessage } = require('../../utils/partnerAutomation');

module.exports = {
    name: '!파트너 전송',
    description: '즉시 1회 전송하고, 이후부터는 매일 1회 자동 전송하도록 활성화합니다.',
    async execute(message) {
        const result = await broadcastPartnerMessage(message.client, message.author.id, {
            enableAutomation: true,
            respectCooldown: false
        });

        if (!result.ok) {
            const reasonMap = {
                RUNNING: '이미 파트너 전송 작업이 진행 중입니다.',
                NO_MESSAGE: '먼저 `!파트너 메시지설정`으로 문구를 저장해주세요.',
                NO_CHANNELS: '등록된 파트너 채널이 없습니다.',
                ALL_FAILED: '전송 가능한 채널이 없어 모든 파트너 전송이 실패했습니다. 채널 권한과 접근 상태를 확인해주세요.'
            };

            return sendTemporaryMessage(
                message.channel,
                reasonMap[result.reason] || '파트너 전송을 시작하지 못했습니다.',
                2000
            );
        }

        await sendTemporaryMessage(
            message.channel,
            `즉시 전송 완료: 성공 ${result.successCount}개 / 실패 ${result.failCount}개\n이제부터 매일 1회 자동 전송합니다.`,
            2000
        );
    }
};
