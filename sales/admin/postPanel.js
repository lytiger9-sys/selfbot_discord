const { sendTemporaryMessage } = require('../../utils/commandUtils');
const {
    isPanelBotConfigured,
    postPanelToChannel
} = require('../panels/panelBot');

module.exports = {
    name: '!임베드게시',
    aliases: ['!임베드 게시'],
    adminOnly: true,
    description: '설정된 패널 봇을 통해 현재 채널에 판매 패널 임베드를 게시합니다.',
    async execute(message) {
        if (!isPanelBotConfigured()) {
            return sendTemporaryMessage(
                message.channel,
                '`.env`에 `BOT_TOKEN` 또는 `PANEL_BOT_TOKEN`이 설정되어 있어야 합니다.',
                2000
            );
        }

        try {
            await postPanelToChannel(message.channel.id);
            await sendTemporaryMessage(message.channel, '패널 봇이 임베드를 게시했습니다.', 2000);
        } catch (error) {
            const isNotReady = error.message === 'PANEL_BOT_NOT_READY';
            await sendTemporaryMessage(
                message.channel,
                isNotReady
                    ? '패널 봇이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.'
                    : '패널 게시에 실패했습니다. 봇 권한과 채널 접근 권한을 확인해주세요.',
                2000
            );
        }
    }
};
