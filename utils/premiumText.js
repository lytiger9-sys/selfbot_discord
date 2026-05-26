const DISCORD_MESSAGE_LIMIT = 1900;

function normalizeText(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\r/g, '').trim();
}

function centerText(text, width) {
    const safeText = normalizeText(text).slice(0, width);
    const totalPadding = Math.max(width - safeText.length, 0);
    const leftPadding = Math.floor(totalPadding / 2);
    const rightPadding = totalPadding - leftPadding;

    return `${' '.repeat(leftPadding)}${safeText}${' '.repeat(rightPadding)}`;
}

function createBanner(accent = 'MANUS PREMIUM') {
    const safeAccent = normalizeText(accent).toUpperCase() || 'MANUS PREMIUM';

    return [
        '```text',
        '╔════════════════════════════════════════════╗',
        `║${centerText(safeAccent, 44)}║`,
        '╚════════════════════════════════════════════╝',
        '```'
    ].join('\n');
}

function normalizeLines(lines = []) {
    return lines
        .flat()
        .map(line => normalizeText(line))
        .filter(Boolean);
}

function buildTextCard({ accent, title, subtitle, sections = [], footer }) {
    const parts = [createBanner(accent)];

    if (title) parts.push(`**${normalizeText(title)}**`);
    if (subtitle) parts.push(normalizeText(subtitle));

    sections.forEach(section => {
        const label = normalizeText(section.label);
        const lines = normalizeLines(section.lines);

        if (!label && lines.length === 0) return;

        if (label) parts.push(`✦ ${label}`);
        if (lines.length > 0) parts.push(lines.join('\n'));
    });

    if (footer) parts.push(`_${normalizeText(footer)}_`);

    return parts.join('\n\n');
}

function escapeCodeBlock(text) {
    return normalizeText(text).replace(/```/g, "'''");
}

function splitLongLine(line, limit) {
    if (line.length <= limit) return [line];

    const chunks = [];
    let remaining = line;

    while (remaining.length > limit) {
        chunks.push(remaining.slice(0, limit));
        remaining = remaining.slice(limit);
    }

    if (remaining) chunks.push(remaining);

    return chunks;
}

function splitDiscordMessage(text, limit = DISCORD_MESSAGE_LIMIT) {
    const normalized = normalizeText(text);
    if (!normalized) return [];
    if (normalized.length <= limit) return [normalized];

    const chunks = [];
    let current = '';

    const flush = () => {
        if (current) {
            chunks.push(current);
            current = '';
        }
    };

    const append = segment => {
        if (!segment) return;

        const candidate = current ? `${current}\n\n${segment}` : segment;
        if (candidate.length <= limit) {
            current = candidate;
            return;
        }

        flush();

        if (segment.length <= limit) {
            current = segment;
            return;
        }

        const lines = segment.split('\n');
        let lineBuffer = '';

        for (const line of lines) {
            const expandedLines = splitLongLine(line, limit);

            for (const expandedLine of expandedLines) {
                const lineCandidate = lineBuffer ? `${lineBuffer}\n${expandedLine}` : expandedLine;
                if (lineCandidate.length <= limit) {
                    lineBuffer = lineCandidate;
                } else {
                    if (lineBuffer) chunks.push(lineBuffer);
                    lineBuffer = expandedLine;
                }
            }
        }

        if (lineBuffer) current = lineBuffer;
    };

    normalized.split('\n\n').forEach(append);
    flush();

    return chunks;
}

function formatDate(value, fallback = '기록 없음') {
    if (!value) return fallback;

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;

    return new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeZone: process.env.APP_TIMEZONE || 'Asia/Seoul'
    }).format(date);
}

function formatDateTime(value, fallback = '기록 없음') {
    if (!value) return fallback;

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;

    return new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: process.env.APP_TIMEZONE || 'Asia/Seoul'
    }).format(date);
}

function createTextAttachment(name, text) {
    return {
        attachment: Buffer.from(normalizeText(text), 'utf8'),
        name
    };
}

module.exports = {
    buildTextCard,
    createTextAttachment,
    escapeCodeBlock,
    formatDate,
    formatDateTime,
    splitDiscordMessage
};
