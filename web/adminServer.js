const http = require('http');
const {
    appointAdmin,
    canAccessAdminPanel,
    deactivateAdmin,
    fetchActiveAdminAccounts,
    getAdminAccount,
    getDashboardTokenValue,
    getSuperAdminId,
    recordAdminLogin,
    updateAdminRuntimeToken
} = require('../utils/adminStore');
const { refreshAdminClient } = require('../utils/adminClientManager');
const {
    canFallbackPort,
    getBaseUrl,
    getClientId,
    getClientSecret,
    getRedirectUri,
    getRequestedPort,
    getServerHost,
    setActivePort
} = require('./admin/config');
const {
    buildLicensePageUrl,
    createLicenseWorkbook,
    createLicenses,
    deleteLicenseById,
    fetchRecentLicenses,
    getLicenseFilters
} = require('./admin/licenseService');
const {
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
} = require('./admin/sessionStore');
const {
    escapeHtml,
    renderAdminPage,
    renderLayout,
    renderLicensePage,
    renderLoginPage,
    renderSettingsPage
} = require('./admin/render');

const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_ME_URL = 'https://discord.com/api/users/@me';

let serverInstance = null;
let isStartingServer = false;

function redirect(res, location) {
    res.statusCode = 302;
    res.setHeader('Location', location);
    res.end();
}

function sendHtml(res, html, statusCode = 200) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(html);
}

function sendFile(res, buffer, filename, contentType) {
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.end(buffer);
}

async function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let totalLength = 0;

        req.on('data', chunk => {
            totalLength += chunk.length;
            if (totalLength > 1024 * 1024) {
                reject(new Error('REQUEST_BODY_TOO_LARGE'));
                req.destroy();
                return;
            }

            chunks.push(chunk);
        });

        req.on('end', () => {
            resolve(Buffer.concat(chunks).toString('utf8'));
        });

        req.on('error', reject);
    });
}

async function parseFormBody(req) {
    const body = await readRequestBody(req);
    const params = new URLSearchParams(body);
    return [...params.entries()].reduce((result, [key, value]) => {
        result[key] = value;
        return result;
    }, {});
}

function getDiscordAuthorizeUrl(state) {
    const params = new URLSearchParams({
        client_id: getClientId(),
        redirect_uri: getRedirectUri(),
        response_type: 'code',
        scope: 'identify',
        prompt: 'consent',
        state
    });

    return `${DISCORD_AUTHORIZE_URL}?${params.toString()}`;
}

async function exchangeCodeForAccessToken(code) {
    const body = new URLSearchParams({
        client_id: getClientId(),
        client_secret: getClientSecret(),
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri()
    });

    const response = await fetch(DISCORD_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
    });

    if (!response.ok) {
        throw new Error(`DISCORD_TOKEN_EXCHANGE_FAILED_${response.status}`);
    }

    return response.json();
}

async function fetchDiscordUser(accessToken) {
    const response = await fetch(DISCORD_ME_URL, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`DISCORD_USER_FETCH_FAILED_${response.status}`);
    }

    return response.json();
}

function appendFlash(path, key, value) {
    const url = new URL(`http://localhost${path}`);
    url.searchParams.set(key, value);
    return `${url.pathname}${url.search}`;
}

function buildRelativeUrl(path, searchParams) {
    const url = new URL(`http://localhost${path}`);

    for (const [key, value] of searchParams.entries()) {
        url.searchParams.append(key, value);
    }

    return `${url.pathname}${url.search}`;
}

function describeError(error) {
    if (error instanceof AggregateError) {
        return {
            name: error.name,
            message: error.message,
            errors: (error.errors || []).map(item => describeError(item))
        };
    }

    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            code: error.code || '',
            errno: error.errno || '',
            stack: error.stack
        };
    }

    if (error && typeof error === 'object') {
        return error;
    }

    return { value: String(error) };
}

function getRoleLandingPath(session) {
    return session.isSuperAdmin ? '/admin/admins' : '/admin/licenses';
}

function mapLoginError(error) {
    if (error.message === 'ADMIN_LOGIN_FORBIDDEN') {
        return '관리자 권한이 없는 계정입니다. SUPER_ADMIN_ID 환경변수 또는 admin_accounts 설정을 확인해 주세요.';
    }

    if (error.message === 'DISCORD_OAUTH_STATE_INVALID') {
        return '로그인 상태 검증에 실패했습니다. 배포 주소와 쿠키 설정을 확인해 주세요.';
    }

    if (error.message === 'DISCORD_OAUTH_CODE_MISSING') {
        return 'Discord 콜백에 code 값이 없습니다. OAuth Redirect URI를 다시 확인해 주세요.';
    }

    if (error.message === 'DISCORD_OAUTH_STATE_MISSING') {
        return 'Discord 콜백에 state 값이 없습니다. OAuth 설정을 다시 확인해 주세요.';
    }

    if (error.message === 'DISCORD_OAUTH_STATE_COOKIE_MISMATCH') {
        return 'OAuth state 쿠키가 일치하지 않습니다. 브라우저 쿠키와 배포 주소를 확인해 주세요.';
    }

    if (error.message === 'DISCORD_OAUTH_STATE_EXPIRED') {
        return 'OAuth state가 만료되었거나 서버가 재시작되었습니다. 다시 로그인해 주세요.';
    }

    switch (error.message) {
    case 'OAUTH_NOT_CONFIGURED':
        return 'Discord OAuth 설정이 비어 있습니다.';
    case 'ADMIN_LOGIN_FORBIDDEN':
        return '관리자 권한이 없는 계정입니다.';
    case 'DISCORD_OAUTH_STATE_INVALID':
        return '로그인 상태 검증에 실패했습니다.';
    default:
        return `Discord 로그인 실패: ${error.message}`;
    }
}

function mapActionError(error) {
    switch (error.message) {
    case 'ADMIN_USER_ID_REQUIRED':
        return '관리자 ID를 입력해 주세요.';
    case 'SUPER_ADMIN_CANNOT_BE_DEACTIVATED':
        return '최고 관리자는 삭제할 수 없습니다.';
    case 'LICENSE_COUNT_INVALID':
        return '라이센스 개수는 1 이상이어야 합니다.';
    case 'LICENSE_DURATION_INVALID':
        return '기간은 숫자 또는 영구여야 합니다.';
    case 'LICENSE_ID_REQUIRED':
        return '삭제할 라이센스 키가 비어 있습니다.';
    case 'LICENSE_NOT_FOUND':
        return '해당 라이센스를 찾을 수 없습니다.';
    case 'ADMIN_RUNTIME_TOKEN_REQUIRED':
        return '토큰을 입력해 주세요.';
    case 'REQUEST_BODY_TOO_LARGE':
        return '요청 크기가 너무 큽니다.';
    default:
        return error.message || '요청 처리 중 오류가 발생했습니다.';
    }
}

async function requireSession(res, session) {
    if (session) {
        return true;
    }

    redirect(res, '/admin/login');
    return false;
}

async function requireSuperAdmin(res, session) {
    if (session?.isSuperAdmin) {
        return true;
    }

    redirect(res, appendFlash('/admin/licenses', 'error', '최고 관리자만 접근할 수 있습니다.'));
    return false;
}

async function handleRequest(req, res) {
    cleanupExpiredOAuthStates();

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const session = getSession(req);

    if (req.method === 'GET' && url.pathname === '/') {
        redirect(res, '/admin');
        return;
    }

    if (req.method === 'GET' && url.pathname === '/admin/login') {
        if (url.searchParams.get('code') || url.searchParams.get('state')) {
            console.warn('[Admin OAuth] code/state arrived on /admin/login; redirecting to /admin/oauth/callback');
            redirect(res, buildRelativeUrl('/admin/oauth/callback', url.searchParams));
            return;
        }

        sendHtml(res, renderLoginPage({
            noticeMessage: url.searchParams.get('notice') || '',
            errorMessage: url.searchParams.get('error') || ''
        }));
        return;
    }

    if (req.method === 'GET' && url.pathname === '/admin/discord/login') {
        if (!getClientId() || !getClientSecret()) {
            redirect(res, appendFlash('/admin/login', 'error', mapLoginError(new Error('OAUTH_NOT_CONFIGURED'))));
            return;
        }

        const state = createOAuthState();
        appendSetCookie(res, serializeCookie(OAUTH_STATE_COOKIE_NAME, state, { maxAge: OAUTH_STATE_TTL_MS / 1000 }));
        redirect(res, getDiscordAuthorizeUrl(state));
        return;
    }

    if (req.method === 'GET' && url.pathname === '/admin/oauth/callback') {
        try {
            const code = String(url.searchParams.get('code') || '').trim();
            const state = String(url.searchParams.get('state') || '').trim();
            const cookies = parseCookies(req.headers.cookie || '');
            const stateCookie = String(cookies[OAUTH_STATE_COOKIE_NAME] || '').trim();

            if (!code) {
                throw new Error('DISCORD_OAUTH_CODE_MISSING');
            }

            if (!state) {
                throw new Error('DISCORD_OAUTH_STATE_MISSING');
            }

            if (state !== stateCookie) {
                throw new Error('DISCORD_OAUTH_STATE_COOKIE_MISMATCH');
            }

            if (!consumeOAuthState(state)) {
                throw new Error('DISCORD_OAUTH_STATE_EXPIRED');
            }

            appendSetCookie(res, serializeCookie(OAUTH_STATE_COOKIE_NAME, '', { maxAge: 0 }));

            const tokenData = await exchangeCodeForAccessToken(code);
            const user = await fetchDiscordUser(tokenData.access_token);
            const userId = String(user.id || '').trim();
            const displayName = user.global_name
                || user.username
                || `${user.username || ''}${user.discriminator && user.discriminator !== '0' ? `#${user.discriminator}` : ''}`;
            const isSuperAdmin = userId === getSuperAdminId();
            const allowed = isSuperAdmin || await canAccessAdminPanel(userId);

            if (!allowed) {
                throw new Error('ADMIN_LOGIN_FORBIDDEN');
            }

            await recordAdminLogin({
                userId,
                displayName,
                rawToken: null
            });

            const sessionId = createSession({
                userId,
                displayName,
                isSuperAdmin
            });

            appendSetCookie(res, serializeCookie(SESSION_COOKIE_NAME, sessionId, { maxAge: SESSION_TTL_MS / 1000 }));
            redirect(res, getRoleLandingPath({ isSuperAdmin }));
        } catch (error) {
            console.error('[Admin OAuth Callback]', JSON.stringify({
                error: describeError(error),
                query: {
                    hasCode: Boolean(url.searchParams.get('code')),
                    hasState: Boolean(url.searchParams.get('state')),
                    error: url.searchParams.get('error') || '',
                    errorDescription: url.searchParams.get('error_description') || ''
                },
                cookie: {
                    hasStateCookie: Boolean(parseCookies(req.headers.cookie || '')[OAUTH_STATE_COOKIE_NAME]),
                    host: req.headers.host || '',
                    forwardedProto: req.headers['x-forwarded-proto'] || ''
                }
            }));
            redirect(res, appendFlash('/admin/login', 'error', mapLoginError(error)));
        }
        return;
    }

    if (req.method === 'POST' && url.pathname === '/admin/logout') {
        if (session) {
            destroySession(session.id);
        }

        appendSetCookie(res, serializeCookie(SESSION_COOKIE_NAME, '', { maxAge: 0 }));
        redirect(res, appendFlash('/admin/login', 'notice', '로그아웃되었습니다.'));
        return;
    }

    if (req.method === 'GET' && url.pathname === '/admin') {
        if (!session) {
            redirect(res, '/admin/login');
            return;
        }

        redirect(res, getRoleLandingPath(session));
        return;
    }

    if (req.method === 'GET' && url.pathname === '/admin/admins') {
        if (!await requireSession(res, session)) return;
        if (!await requireSuperAdmin(res, session)) return;

        const accounts = await fetchActiveAdminAccounts();
        const adminRows = accounts.map(account => ({
            ...account,
            is_super_admin: String(account.user_id) === getSuperAdminId(),
            dashboard_token: getDashboardTokenValue(account)
        }));

        sendHtml(res, renderAdminPage({
            session,
            adminRows,
            noticeMessage: url.searchParams.get('notice') || '',
            errorMessage: url.searchParams.get('error') || ''
        }));
        return;
    }

    if (req.method === 'GET' && url.pathname === '/admin/licenses') {
        if (!await requireSession(res, session)) return;

        const filters = getLicenseFilters(url.searchParams);
        const licenseRows = await fetchRecentLicenses(filters);
        sendHtml(res, renderLicensePage({
            session,
            licenseRows,
            filters,
            noticeMessage: url.searchParams.get('notice') || '',
            errorMessage: url.searchParams.get('error') || ''
        }));
        return;
    }

    if (req.method === 'GET' && url.pathname === '/admin/licenses/export.xls') {
        if (!await requireSession(res, session)) return;

        const filters = getLicenseFilters(url.searchParams);
        const licenseRows = await fetchRecentLicenses(filters);
        sendFile(
            res,
            createLicenseWorkbook(licenseRows),
            'licenses.xls',
            'application/vnd.ms-excel; charset=utf-8'
        );
        return;
    }

    if (req.method === 'GET' && url.pathname === '/admin/settings') {
        if (!await requireSession(res, session)) return;

        const account = await getAdminAccount(session.userId);
        const currentToken = account ? getDashboardTokenValue(account) : '';
        sendHtml(res, renderSettingsPage({
            session,
            currentToken,
            noticeMessage: url.searchParams.get('notice') || '',
            errorMessage: url.searchParams.get('error') || ''
        }));
        return;
    }

    if (!await requireSession(res, session)) {
        return;
    }

    if (req.method === 'POST' && url.pathname === '/admin/admins/appoint') {
        if (!await requireSuperAdmin(res, session)) return;

        try {
            const form = await parseFormBody(req);
            await appointAdmin(form.user_id, form.display_name, session.userId);
            redirect(res, appendFlash('/admin/admins', 'notice', `관리자 ${form.user_id} 를 추가했습니다.`));
        } catch (error) {
            redirect(res, appendFlash('/admin/admins', 'error', mapActionError(error)));
        }
        return;
    }

    if (req.method === 'POST' && url.pathname === '/admin/admins/deactivate') {
        if (!await requireSuperAdmin(res, session)) return;

        try {
            const form = await parseFormBody(req);
            await deactivateAdmin(form.user_id);
            await refreshAdminClient(form.user_id).catch(() => {});
            redirect(res, appendFlash('/admin/admins', 'notice', `관리자 ${form.user_id} 를 삭제했습니다.`));
        } catch (error) {
            redirect(res, appendFlash('/admin/admins', 'error', mapActionError(error)));
        }
        return;
    }

    if (req.method === 'POST' && url.pathname === '/admin/licenses/create') {
        try {
            const form = await parseFormBody(req);
            const result = await createLicenses(form.duration, form.count);
            const label = result.durationDays >= 99999 ? '영구' : `${result.durationDays}일`;
            const returnPath = buildLicensePageUrl({
                q: form.return_q,
                status: form.return_status
            });
            redirect(res, appendFlash(returnPath, 'notice', `${label} 라이센스 ${result.count}개를 생성했습니다.`));
        } catch (error) {
            redirect(res, appendFlash(buildLicensePageUrl(), 'error', mapActionError(error)));
        }
        return;
    }

    if (req.method === 'POST' && url.pathname === '/admin/licenses/delete') {
        try {
            const form = await parseFormBody(req);
            await deleteLicenseById(form.license_id);
            const returnPath = buildLicensePageUrl({
                q: form.return_q,
                status: form.return_status
            });
            redirect(res, appendFlash(returnPath, 'notice', `라이센스 ${form.license_id} 를 삭제했습니다.`));
        } catch (error) {
            redirect(res, appendFlash(buildLicensePageUrl(), 'error', mapActionError(error)));
        }
        return;
    }

    if (req.method === 'POST' && url.pathname === '/admin/settings/token') {
        try {
            const form = await parseFormBody(req);
            await updateAdminRuntimeToken(session.userId, form.runtime_token);
            await refreshAdminClient(session.userId).catch(() => {});
            redirect(res, appendFlash('/admin/settings', 'notice', '토큰을 저장했고 즉시 반영을 시도했습니다.'));
        } catch (error) {
            redirect(res, appendFlash('/admin/settings', 'error', mapActionError(error)));
        }
        return;
    }

    sendHtml(res, renderLayout({
        title: '404',
        body: `
          <div class="hero">
            <div>
              <div class="eyebrow">404</div>
              <h1>페이지를 찾을 수 없습니다.</h1>
              <p>요청한 경로가 없습니다.</p>
            </div>
          </div>`
    }), 404);
}

function createServer() {
    return http.createServer((req, res) => {
        handleRequest(req, res).catch(error => {
            console.error('[AdminWeb]', error.message);
            sendHtml(res, renderLayout({
                title: '오류',
                body: `
                  <div class="hero">
                    <div>
                      <div class="eyebrow">Error</div>
                      <h1>내부 오류</h1>
                      <p>${escapeHtml(error.message)}</p>
                    </div>
                  </div>`
            }), 500);
        });
    });
}

function bindServer(port, host) {
    return new Promise((resolve, reject) => {
        const server = createServer();

        const onError = async error => {
            if (error.code === 'EADDRINUSE' && canFallbackPort() && port < 3010) {
                console.warn(`[AdminWeb Listen] ${port} 포트 사용 중, ${port + 1} 포트로 재시도합니다.`);
                try {
                    const fallbackServer = await bindServer(port + 1, host);
                    resolve(fallbackServer);
                } catch (fallbackError) {
                    reject(fallbackError);
                }
                return;
            }

            reject(error);
        };

        server.once('error', onError);
        server.listen(port, host, () => {
            server.off('error', onError);
            server.on('error', error => {
                console.error('[AdminWeb Listen]', error.message);
            });
            setActivePort(server.address()?.port || port);
            console.log(`[AdminWeb] ${getBaseUrl()}/admin`);
            resolve(server);
        });
    });
}

function startAdminWebServer() {
    if (serverInstance || isStartingServer) {
        return serverInstance;
    }

    isStartingServer = true;
    const host = getServerHost();

    (async () => {
        try {
            serverInstance = await bindServer(getRequestedPort(), host);
            isStartingServer = false;
        } catch (error) {
            isStartingServer = false;
            serverInstance = null;
            console.error('[AdminWeb Listen]', error.message);
        }
    })();

    return serverInstance;
}

module.exports = {
    startAdminWebServer
};
