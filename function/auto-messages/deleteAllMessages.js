const {
    collectRecentOwnMessagesFromChannels,
    deleteMessagesSequential,
    sortChannelsByActivity
} = require('../../utils/messageCleanup');
const { isTextCommandChannel, sendTemporaryMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!삭제 전체',
    description: '접근 가능한 모든 DM/서버 텍스트 채널에서 내가 보낸 메시지를 최근순으로 지정 개수만큼 삭제합니다.\n사용 예시: `!삭제 전체 50`',
    async execute(message, args) {
        const count = Number.parseInt(args[0], 10);

        if (Number.isNaN(count) || count <= 0) {
            return sendTemporaryMessage(message.channel, '사용법: `!삭제 전체 (개수)`', 2000);
        }

        const channels = sortChannelsByActivity(
            message.client.channels.cache.filter(channel => isTextCommandChannel(channel))
        );

        const targets = await collectRecentOwnMessagesFromChannels(
            channels,
            message.client.user.id,
            count,
            new Set([message.id])
        );

        const deletedCount = await deleteMessagesSequential(targets);
        await sendTemporaryMessage(message.channel, `✅ 전체 채널 기준으로 본인 메시지 ${deletedCount}개를 삭제했습니다.`, 2000);
    }
};
