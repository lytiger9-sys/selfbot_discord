const {
    collectRecentOwnMessagesFromChannels,
    deleteMessagesSequential,
    sortChannelsByActivity
} = require('../../utils/messageCleanup');
const { isTextCommandChannel, sendTemporaryMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!삭제 서버',
    description: '현재 서버의 모든 텍스트 채널에서 내가 보낸 메시지를 최근순으로 지정 개수만큼 삭제합니다.\n사용 예시: `!삭제 서버 30`',
    async execute(message, args) {
        const count = Number.parseInt(args[0], 10);

        if (Number.isNaN(count) || count <= 0) {
            return sendTemporaryMessage(message.channel, '사용법: `!삭제 서버 (개수)`', 2000);
        }

        if (!message.guild) {
            return sendTemporaryMessage(message.channel, '❌ 현재 채널은 서버가 아닙니다.', 2000);
        }

        const channels = sortChannelsByActivity(
            message.guild.channels.cache.filter(channel => isTextCommandChannel(channel))
        );

        const targets = await collectRecentOwnMessagesFromChannels(
            channels,
            message.client.user.id,
            count,
            new Set([message.id])
        );

        const deletedCount = await deleteMessagesSequential(targets);
        await sendTemporaryMessage(message.channel, `✅ 현재 서버에서 본인 메시지 ${deletedCount}개를 삭제했습니다.`, 2000);
    }
};
