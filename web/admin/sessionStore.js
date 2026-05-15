const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'vc_admin_session';
const OAUTH_STATE_COOKIE_NAME = 'vc_admin_oauth_state';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const OAUTH_STATE_TTL_MS = 1000 * 60 * 10;

const sessions = new Map();
const oauthStates = new Map();

function parseCookies(cookieHeader = '') {
    return cookieHeader
        .split(';')
        .map(part => part.trim())
        .filter(Boolean)
        .reduce((result, part) => {
            const index = part.indexOf('=');
            if (index < 0) return result;

            const key = decodeURIComponent(part.slice(0, index).trim());
            const value = decodeURIComponent(part.slice(index + 1).trim());
            result[key] = value;
            return result;
        }, {});
}

function serializeCookie(name, value, { maxAge = null } = {}) {
    const parts = [
        `${name}=${encodeURIComponent(value)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax'
    ];

    if (maxAge !== null) {
        parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
    }

    return parts.join('; ');
}

function appendSetCookie(res, cookieValue) {
    const current = res.getHeader('Set-Cookie');
    const next = Array.isArray(current)
        ? [...current, cookieValue]
        : current
            ? [current, cookieValue]
            : [cookieValue];

    res.setHeader('Set-Cookie', next);
}

function createSession(sessionData) {
    const sessionId = crypto.randomBytes(24).toString('hex');
    sessions.set(sessionId, {
        ...sessionData,
        expiresAt: Date.now() + SESSION_TTL_MS
    });
    return sessionId;
}

function getSession(req) {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionId = cookies[SESSION_COOKIE_NAME];
    if (!sessionId) return null;

    const session = sessions.get(sessionId);
    if (!session) return null;

    if (session.expiresAt <= Date.now()) {
        sessions.delete(sessionId);
        return null;
    }

    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return { id: sessionId, ...session };
}

function destroySession(sessionId) {
    if (sessionId) {
        sessions.delete(sessionId);
    }
}

function createOAuthState() {
    const state = crypto.randomBytes(20).toString('hex');
    oauthStates.set(state, Date.now() + OAUTH_STATE_TTL_MS);
    return state;
}

function consumeOAuthState(state) {
    const expiresAt = oauthStates.get(state);
    oauthStates.delete(state);
    return Boolean(expiresAt && expiresAt > Date.now());
}

function cleanupExpiredOAuthStates() {
    const now = Date.now();
    for (const [state, expiresAt] of oauthStates.entries()) {
        if (expiresAt <= now) {
            oauthStates.delete(state);
        }
    }
}

module.exports = {
    OAUTH_STATE_COOKIE_NAME,
    OAUTH_STATE_TTL_MS,
    SESSION_COOKIE_NAME,
    SESSION_TTL_MS,
    appendSetCookie,
    cleanupExpiredOAuthStates,
    consumeOAuthState,
    createOAuthState,
    createSession,
    destroySession,
    getSession,
    parseCookies,
    serializeCookie
};
