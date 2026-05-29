const { sendTemporaryMessage } = require('../../../utils/commandUtils');
const { startCycleSpam } = require('./cycle');
const { startCountSpam } = require('./count');

function parseSpamCommand(rawArgs) {
    const normalized = rawArgs.trim();

    const cycleMatch = normalized.match(/^주기\s+([0-9]+(?:\.[0-9]+)?)\s*(?:분)?\s+([\s\S]+)$/);
    if (cycleMatch) {
        return {
            content: cycleMatch[2].trim(),
            intervalMinutes: Number.parseFloat(cycleMatch[1]),
            mode: 'cycle'
        };
    }

    const countMatch = normalized.match(/^횟수\s+([0-9]+)\s*(?:회|개)?\s+([\s\S]+)$/);
    if (countMatch) {
        return {
            content: countMatch[2].trim(),
            repeatCount: Number.parseInt(countMatch[1], 10),
            mode: 'count'
        };
    }

    return null;
}

function sendUsage(message) {
    return sendTemporaryMessage(
        message.channel,
        '사용법: `!도배 주기 x분 [메시지]` 또는 `!도배 횟수 x회 [메시지]`',
        2500
    );
}

module.exports = {
    name: '!도배',
    description: '도배 메시지를 반복 전송합니다.\n사용법: `!도배 주기 x분 [메시지]`\n사용법: `!도배 횟수 x회 [메시지]`',
    async execute(message, args, rawArgs) {
        const parsed = parseSpamCommand(rawArgs);
        if (!parsed || !parsed.content) {
            return sendUsage(message);
        }

        if (parsed.mode === 'cycle') {
            if (!Number.isFinite(parsed.intervalMinutes) || parsed.intervalMinutes <= 0) {
                return sendUsage(message);
            }

            startCycleSpam(message.channel, parsed.content, parsed.intervalMinutes, () => {
                sendTemporaryMessage(message.channel, '도배 전송 중 오류가 발생했습니다.', 2500).catch(() => {});
            });
            return;
        }

        if (!Number.isFinite(parsed.repeatCount) || parsed.repeatCount <= 0) {
            return sendUsage(message);
        }

        startCountSpam(message.channel, parsed.content, parsed.repeatCount, () => {
            sendTemporaryMessage(message.channel, '도배 전송 중 오류가 발생했습니다.', 2500).catch(() => {});
        });
    }
};
