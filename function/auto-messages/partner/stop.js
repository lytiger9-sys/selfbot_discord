const { sendTemporaryMessage } = require('../../../utils/commandUtils');
const { getPartnerOverview, setAutomationState } = require('../../../utils/partnerAutomation');

module.exports = {
    name: '!파트너 중지',
    description: '파트너 자동 전송을 중지합니다.',
    async execute(message) {
        const overview = await getPartnerOverview(message.author.id);
        await setAutomationState(message.author.id, false, overview.lastSentAt);
        await sendTemporaryMessage(message.channel, '✅ 파트너 자동 전송을 중지했습니다.', 2000);
    }
};
