const { sendMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!핑',
    aliases: ['!ping'],
    description: '!핑: 웹소켓 지연(ms)과 메시지 처리 지연을 확인합니다.',
    async execute(message) {
        const websocketLatency = Math.max(0, Math.round(message.client.ws.ping || 0));
        const messageLatency = Math.max(0, Date.now() - message.createdTimestamp);

        await sendMessage(
            message.channel,
            `**측정 결과**\n- 웹소켓 지연: \`${websocketLatency}ms\`\n- 메시지 처리 지연: \`${messageLatency}ms\``
        );
    }
};
