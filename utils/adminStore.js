const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { decrypt, encrypt } = require('../cryptoUtils');

const adminIds = new Set();

function getLegacyAdminFilePath() {
    return path.join(__dirname, '..', 'sales', 'masters.json');
}

function getSuperAdminId() {
    const configured = String(process.env.SUPER_ADMIN_ID || process.env.OWNER_ID || '').trim();
    if (configured) {
        return configured;
    }

    return String(readLegacyAdminRecords()[0]?.id || '').trim();
}

function readLegacyAdminRecords() {
    const filePath = getLegacyAdminFilePath();

    if (!fs.existsSync(filePath)) {
        return [];
    }

    try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return Array.isArray(raw.developers) ? raw.developers : [];
    } catch (error) {
        console.error('[AdminStore Legacy Read]', error.message);
        return [];
    }
}

async function refreshAdminCache() {
    adminIds.clear();

    const superAdminId = getSuperAdminId();
    if (superAdminId) {
        adminIds.add(superAdminId);
    }

    const [rows] = await pool.execute(
        'SELECT user_id FROM admin_accounts WHERE is_active = TRUE'
    );

    for (const row of rows) {
        if (row.user_id) {
            adminIds.add(String(row.user_id));
        }
    }

    return new Set(adminIds);
}

function isMasterUser(userId) {
    return adminIds.has(String(userId || ''));
}

function formatLegacyDate(value) {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toISOString().slice(0, 10);
}

async function syncLegacyAdminFile() {
    const accounts = await fetchActiveAdminAccounts();
    const payload = {
        developers: accounts.map(account => ({
            id: String(account.user_id || ''),
            token: getDashboardTokenValue(account),
            appointed_at: formatLegacyDate(account.appointed_at || account.created_at),
            name: String(account.display_name || '')
        })),
        note: '관리자 계정 동기화 파일입니다. 웹 패널과 DB 기준으로 자동 갱신됩니다.'
    };

    fs.writeFileSync(
        getLegacyAdminFilePath(),
        JSON.stringify(payload, null, 2),
        'utf8'
    );
}

async function seedAdminAccountsFromLegacyFile() {
    const records = readLegacyAdminRecords();

    for (const record of records) {
        const userId = String(record.id || '').trim();
        if (!userId) continue;

        const displayName = String(record.name || '').trim() || null;
        const rawToken = String(record.token || '').trim() || null;
        const appointedAt = String(record.appointed_at || '').trim() || null;
        const encryptedToken = rawToken ? encrypt(rawToken) : null;

        await pool.execute(
            `INSERT INTO admin_accounts (
                user_id,
                display_name,
                encrypted_token,
                appointed_at,
                is_active
            )
             VALUES (?, ?, ?, COALESCE(?, NOW()), TRUE)
             ON DUPLICATE KEY UPDATE
             display_name = COALESCE(VALUES(display_name), display_name),
             encrypted_token = COALESCE(admin_accounts.encrypted_token, VALUES(encrypted_token)),
             appointed_at = COALESCE(admin_accounts.appointed_at, VALUES(appointed_at)),
             is_active = TRUE`,
            [userId, displayName, encryptedToken, appointedAt]
        );
    }
}

async function ensureAdminBootstrap() {
    await seedAdminAccountsFromLegacyFile();
    await refreshAdminCache();
    await syncLegacyAdminFile();
}

async function getAdminAccount(userId) {
    const [rows] = await pool.execute(
        'SELECT * FROM admin_accounts WHERE user_id = ? LIMIT 1',
        [String(userId)]
    );

    return rows[0] || null;
}

async function fetchActiveAdminAccounts() {
    const [rows] = await pool.execute(
        `SELECT *
         FROM admin_accounts
         WHERE is_active = TRUE
         ORDER BY
            CASE WHEN user_id = ? THEN 0 ELSE 1 END,
            appointed_at ASC,
            created_at ASC`,
        [getSuperAdminId()]
    );

    return rows;
}

async function fetchRuntimeAdminAccounts() {
    const [rows] = await pool.execute(
        `SELECT user_id, display_name, encrypted_token
         FROM admin_accounts
         WHERE is_active = TRUE
           AND encrypted_token IS NOT NULL`
    );

    return rows;
}

async function canAccessAdminPanel(userId) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) return false;

    if (normalizedUserId === getSuperAdminId()) {
        return true;
    }

    const account = await getAdminAccount(normalizedUserId);
    return Boolean(account?.is_active);
}

async function appointAdmin(userId, displayName, appointedBy = null) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
        throw new Error('ADMIN_USER_ID_REQUIRED');
    }

    const normalizedName = String(displayName || '').trim() || null;
    const normalizedAppointedBy = String(appointedBy || '').trim() || null;

    await pool.execute(
        `INSERT INTO admin_accounts (
            user_id,
            display_name,
            appointed_by,
            appointed_at,
            is_active
        )
         VALUES (?, ?, ?, NOW(), TRUE)
         ON DUPLICATE KEY UPDATE
         display_name = COALESCE(VALUES(display_name), display_name),
         appointed_by = COALESCE(VALUES(appointed_by), appointed_by),
         is_active = TRUE`,
        [normalizedUserId, normalizedName, normalizedAppointedBy]
    );

    await refreshAdminCache();
    await syncLegacyAdminFile();
    return getAdminAccount(normalizedUserId);
}

async function deactivateAdmin(userId) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) return;

    if (normalizedUserId === getSuperAdminId()) {
        throw new Error('SUPER_ADMIN_CANNOT_BE_DEACTIVATED');
    }

    await pool.execute(
        'UPDATE admin_accounts SET is_active = FALSE WHERE user_id = ?',
        [normalizedUserId]
    );

    await refreshAdminCache();
    await syncLegacyAdminFile();
}

async function recordAdminLogin({ userId, displayName, rawToken }) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
        throw new Error('ADMIN_USER_ID_REQUIRED');
    }

    const allowed = await canAccessAdminPanel(normalizedUserId);
    if (!allowed) {
        throw new Error('ADMIN_LOGIN_FORBIDDEN');
    }

    const normalizedName = String(displayName || '').trim() || null;
    const encryptedToken = rawToken ? encrypt(rawToken) : null;

    await pool.execute(
        `INSERT INTO admin_accounts (
            user_id,
            display_name,
            encrypted_token,
            appointed_at,
            last_login_at,
            is_active
        )
         VALUES (?, ?, ?, NOW(), NOW(), TRUE)
         ON DUPLICATE KEY UPDATE
         display_name = VALUES(display_name),
         encrypted_token = COALESCE(VALUES(encrypted_token), encrypted_token),
         last_login_at = NOW(),
         is_active = TRUE`,
        [normalizedUserId, normalizedName, encryptedToken]
    );

    await refreshAdminCache();
    await syncLegacyAdminFile();
    return getAdminAccount(normalizedUserId);
}

async function updateAdminRuntimeToken(userId, rawToken) {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
        throw new Error('ADMIN_USER_ID_REQUIRED');
    }

    const token = String(rawToken || '').trim();
    if (!token) {
        throw new Error('ADMIN_RUNTIME_TOKEN_REQUIRED');
    }

    const allowed = await canAccessAdminPanel(normalizedUserId);
    if (!allowed) {
        throw new Error('ADMIN_LOGIN_FORBIDDEN');
    }

    await pool.execute(
        `INSERT INTO admin_accounts (
            user_id,
            encrypted_token,
            appointed_at,
            last_login_at,
            is_active
        )
         VALUES (?, ?, NOW(), NOW(), TRUE)
         ON DUPLICATE KEY UPDATE
         encrypted_token = VALUES(encrypted_token),
         last_login_at = NOW(),
         is_active = TRUE`,
        [normalizedUserId, encrypt(token)]
    );

    await refreshAdminCache();
    await syncLegacyAdminFile();
    return getAdminAccount(normalizedUserId);
}

function getDashboardTokenValue(account) {
    if (!account?.encrypted_token || !account?.last_login_at) {
        return '';
    }

    try {
        return decrypt(account.encrypted_token);
    } catch (error) {
        return '';
    }
}

module.exports = {
    appointAdmin,
    canAccessAdminPanel,
    deactivateAdmin,
    ensureAdminBootstrap,
    fetchActiveAdminAccounts,
    fetchRuntimeAdminAccounts,
    getAdminAccount,
    getDashboardTokenValue,
    getSuperAdminId,
    isMasterUser,
    recordAdminLogin,
    refreshAdminCache,
    syncLegacyAdminFile,
    updateAdminRuntimeToken
};
