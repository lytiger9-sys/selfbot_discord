let activePort = null;

function getServerHost() {
    return process.env.ADMIN_WEB_HOST || '0.0.0.0';
}

function getRequestedPort() {
    return Number.parseInt(process.env.ADMIN_WEB_PORT || '3000', 10);
}

function isLocalUrl(urlValue) {
    try {
        const parsed = new URL(urlValue);
        return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
    } catch (error) {
        return false;
    }
}

function applyActivePortToUrl(urlValue) {
    if (!activePort || !urlValue || !isLocalUrl(urlValue)) {
        return urlValue;
    }

    const parsed = new URL(urlValue);
    parsed.port = String(activePort);
    return parsed.toString().replace(/\/+$/, '');
}

function getBaseUrl() {
    const configured = String(process.env.ADMIN_WEB_BASE_URL || '').trim();
    if (configured) {
        return applyActivePortToUrl(configured);
    }

    return `http://localhost:${activePort || getRequestedPort()}`;
}

function getRedirectUri() {
    const configured = String(process.env.ADMIN_WEB_REDIRECT_URI || '').trim();
    if (configured) {
        return applyActivePortToUrl(configured);
    }

    return `${getBaseUrl()}/admin/oauth/callback`;
}

function getClientId() {
    return String(process.env.CLIENT_ID || '').trim();
}

function getClientSecret() {
    return String(process.env.CLIENT_SECRET || '').trim();
}

function canFallbackPort() {
    if (process.env.ADMIN_WEB_PORT) {
        return false;
    }

    const configuredUrls = [
        String(process.env.ADMIN_WEB_BASE_URL || '').trim(),
        String(process.env.ADMIN_WEB_REDIRECT_URI || '').trim()
    ].filter(Boolean);

    if (!configuredUrls.length) {
        return true;
    }

    return configuredUrls.every(isLocalUrl);
}

function setActivePort(port) {
    activePort = port;
}

module.exports = {
    canFallbackPort,
    getBaseUrl,
    getClientId,
    getClientSecret,
    getRedirectUri,
    getRequestedPort,
    getServerHost,
    setActivePort
};
