const { sendTemporaryMessage } = require('../../utils/commandUtils');
const { startCycleSpam } = require('./spam/cycle');
const { startDurationSpam } = require('./spam/duration');

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

    const durationMatch = normalized.match(/^기한\s+([0-9]+)\s*(?:초)?\s+([\s\S]+)$/);
    if (durationMatch) {
        return {
            content: durationMatch[2].trim(),
            durationSeconds: Number.parseInt(durationMatch[1], 10),
            mode: 'duration'
        };
    }

    return null;
}

function sendUsage(message) {
    return sendTemporaryMessage(
        message.channel,
        '사용법: `!도배 주기 x분 [메시지]` 또는 `!도배 기한 x초 [메시지]`',
        2500
    );
}

module.exports = {
    name: '!도배',
    description: '도배 메시지를 반복 전송합니다.\n사용법: `!도배 주기 x분 [메시지]`\n사용법: `!도배 기한 x초 [메시지]`',
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
                sendTemporaryMessage(message.channel, '도배 전송이 중단되었습니다.', 2500).catch(() => {});
            });
            return;
        }

        if (!Number.isFinite(parsed.durationSeconds) || parsed.durationSeconds <= 0) {
            return sendUsage(message);
        }

        startDurationSpam(message.channel, parsed.content, parsed.durationSeconds, () => {
            sendTemporaryMessage(message.channel, '도배 전송이 중단되었습니다.', 2500).catch(() => {});
        });
    }
};
