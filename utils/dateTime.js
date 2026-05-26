const DEFAULT_LOCALE = 'ko-KR';

function getDefaultTimeZone() {
    return String(process.env.APP_TIMEZONE || process.env.TZ || 'Asia/Seoul').trim() || 'Asia/Seoul';
}

function toDate(value) {
    if (!value) return null;

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function formatDate(value, fallback = '기록 없음', options = {}) {
    const date = toDate(value);
    if (!date) return fallback;

    return new Intl.DateTimeFormat(options.locale || DEFAULT_LOCALE, {
        dateStyle: 'medium',
        timeZone: options.timeZone || getDefaultTimeZone()
    }).format(date);
}

function formatDateTime(value, fallback = '기록 없음', options = {}) {
    const date = toDate(value);
    if (!date) return fallback;

    return new Intl.DateTimeFormat(options.locale || DEFAULT_LOCALE, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: options.timeZone || getDefaultTimeZone()
    }).format(date);
}

function formatPreciseDateTime(value, fallback = '-', options = {}) {
    const date = toDate(value);
    if (!date) return fallback;

    return new Intl.DateTimeFormat(options.locale || DEFAULT_LOCALE, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: options.timeZone || getDefaultTimeZone()
    }).format(date);
}

module.exports = {
    formatDate,
    formatDateTime,
    formatPreciseDateTime,
    getDefaultTimeZone,
    toDate
};
