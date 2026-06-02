const fetch = require('node-fetch');

const DISCORD_API_BASE_URL = 'https://discord.com/api/v10';
const MAX_RATE_LIMIT_RETRIES = 2;

function getBotToken() {
    return process.env.BOT_TOKEN || process.env.PANEL_BOT_TOKEN || '';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function readResponseBody(response) {
    const rawBody = await response.text();
    if (!rawBody) {
        return null;
    }

    try {
        return JSON.parse(rawBody);
    } catch {
        return rawBody;
    }
}

async function requestDiscordApi(method, endpoint, payload, attempt = 0) {
    const token = getBotToken();
    if (!token) {
        const error = new Error('PANEL_BOT_NOT_CONFIGURED');
        error.code = 'PANEL_BOT_NOT_CONFIGURED';
        throw error;
    }

    const response = await fetch(`${DISCORD_API_BASE_URL}${endpoint}`, {
        method,
        headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json'
        },
        body: payload === undefined ? undefined : JSON.stringify(payload)
    });

    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
        const rateLimitBody = await readResponseBody(response).catch(() => null);
        const retryAfterMs = Math.max(
            1000,
            Math.ceil(Number(rateLimitBody?.retry_after ?? response.headers.get('retry-after') ?? 1) * 1000)
        );

        await sleep(retryAfterMs);
        return requestDiscordApi(method, endpoint, payload, attempt + 1);
    }

    const responseBody = await readResponseBody(response);

    if (!response.ok) {
        const error = new Error(responseBody?.message || `Discord API request failed with status ${response.status}`);
        error.code = responseBody?.code ?? response.status;
        error.status = response.status;
        error.body = responseBody;
        throw error;
    }

    return responseBody;
}

async function sendPanelMessage(channelId, payload) {
    return requestDiscordApi('POST', `/channels/${channelId}/messages`, payload);
}

async function editPanelMessage(channelId, messageId, payload) {
    return requestDiscordApi('PATCH', `/channels/${channelId}/messages/${messageId}`, payload);
}

module.exports = {
    editPanelMessage,
    sendPanelMessage
};
