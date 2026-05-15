function normalizeOptionalText(value) {
    if (value === null || value === undefined) return null;

    const text = String(value).trim();
    return text ? text : null;
}

function normalizeOptionalInteger(value) {
    if (value === null || value === undefined || value === '') return null;

    const number = Number.parseInt(String(value).trim(), 10);
    return Number.isNaN(number) ? null : number;
}

function parseElapsedInput(value) {
    const text = String(value || '').trim();
    if (!text) {
        return null;
    }

    if (/^\d+$/.test(text)) {
        return Number.parseInt(text, 10);
    }

    const parts = text.split(':').map(part => part.trim());
    if (parts.length < 2 || parts.length > 3) {
        return null;
    }

    if (parts.some(part => !/^\d+$/.test(part))) {
        return null;
    }

    const numericParts = parts.map(part => Number.parseInt(part, 10));

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (numericParts.length === 2) {
        [minutes, seconds] = numericParts;
    } else {
        [hours, minutes, seconds] = numericParts;
    }

    if (minutes > 59 || seconds > 59) {
        return null;
    }

    return (hours * 60 * 60) + (minutes * 60) + seconds;
}

function formatElapsedSeconds(totalSeconds) {
    const secondsValue = normalizeOptionalInteger(totalSeconds);
    if (secondsValue === null || secondsValue < 0) {
        return null;
    }

    const hours = Math.floor(secondsValue / 3600);
    const minutes = Math.floor((secondsValue % 3600) / 60);
    const seconds = secondsValue % 60;

    return [hours, minutes, seconds]
        .map(part => String(part).padStart(2, '0'))
        .join(':');
}

function isValidUrl(url) {
    if (!url) return true;

    try {
        const parsed = new URL(String(url));
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch (error) {
        return false;
    }
}

function normalizeButtonPair(labelValue, urlValue) {
    const label = normalizeOptionalText(labelValue);
    const url = normalizeOptionalText(urlValue);

    if (!label && !url) {
        return null;
    }

    if (!label || !url) {
        throw new Error('BUTTON_PAIR_INCOMPLETE');
    }

    if (!isValidUrl(url)) {
        throw new Error('BUTTON_URL_INVALID');
    }

    return { name: label, url };
}

module.exports = {
    formatElapsedSeconds,
    isValidUrl,
    normalizeButtonPair,
    normalizeOptionalInteger,
    normalizeOptionalText,
    parseElapsedInput
};
