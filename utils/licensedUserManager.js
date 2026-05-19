const { Client } = require('discord.js-selfbot-v13');
const pool = require('../db');
const { decrypt } = require('../cryptoUtils');
const { isMasterUser } = require('./commandUtils');
const {
    attachCommandMessageHandler,
    createCommandCollection
} = require('./commandRuntime');
const {
    startPartnerAutomationScheduler,
    stopPartnerAutomationScheduler
} = require('./partnerAutomation');
const {
    applyStoredProfileSettings,
    startProfileSync,
    stopProfileSync
} = require('./profileSync');

const managedClients = new Map();
const retryAfterMap = new Map();
const RETRY_DELAY_MS = 5 * 60 * 1000;

let syncIntervalId = null;
let syncPromise = null;

async function fetchActiveLicensedUserRow(userId) {
    const [rows] = await pool.execute(
        `SELECT us.user_id, us.token, MAX(l.expiry_date) AS latest_expiry_date
         FROM user_settings us
         JOIN licenses l
           ON l.user_id = us.user_id
          AND l.is_used = TRUE
         WHERE us.user_id = ?
           AND us.token IS NOT NULL
         GROUP BY us.user_id, us.token
         HAVING latest_expiry_date IS NOT NULL
            AND latest_expiry_date > NOW()`,
        [userId]
    );

    return rows[0] || null;
}

async function fetchActiveLicensedUsers() {
    const [rows] = await pool.execute(
        `SELECT us.user_id, us.token, MAX(l.expiry_date) AS latest_expiry_date
         FROM user_settings us
         JOIN licenses l
           ON l.user_id = us.user_id
          AND l.is_used = TRUE
         WHERE us.token IS NOT NULL
         GROUP BY us.user_id, us.token
         HAVING latest_expiry_date IS NOT NULL
            AND latest_expiry_date > NOW()`
    );

    return rows;
}

function canRetry(userId) {
    return Date.now() >= (retryAfterMap.get(userId) || 0);
}

function markRetry(userId, delayMs = RETRY_DELAY_MS) {
    retryAfterMap.set(userId, Date.now() + delayMs);
}

function clearRetry(userId) {
    retryAfterMap.delete(userId);
}

async function stopLicensedUserClient(userId, { backoffMs = 0 } = {}) {
    const entry = managedClients.get(userId);
    if (!entry) {
        if (backoffMs > 0) markRetry(userId, backoffMs);
        return;
    }

    managedClients.delete(userId);

    try {
        stopPartnerAutomationScheduler(entry.client);
        stopProfileSync(entry.client);
        entry.client.removeAllListeners();
        entry.client.destroy();
    } catch (error) {
        // noop
    }

    if (backoffMs > 0) {
        markRetry(userId, backoffMs);
    } else {
        clearRetry(userId);
    }
}

async function startLicensedUserClient(userId, encryptedToken) {
    if (managedClients.has(userId)) return managedClients.get(userId);
    if (!canRetry(userId)) return null;

    let token;
    try {
        token = decrypt(encryptedToken);
    } catch (error) {
        console.error(`[LicensedUser ${userId}] token decrypt failed:`, error.message);
        markRetry(userId);
        return null;
    }

    if (!token) {
        markRetry(userId);
        return null;
    }

    const client = new Client({ checkUpdate: false });
    client.commands = createCommandCollection({ includeAdminCommands: false });
    attachCommandMessageHandler(client);

    const entry = {
        client,
        encryptedToken
    };

    managedClients.set(userId, entry);

    client.once('ready', async () => {
        if (client.user?.id !== userId) {
            console.error(`[LicensedUser ${userId}] token owner mismatch: logged in as ${client.user?.id}`);
            await stopLicensedUserClient(userId, { backoffMs: RETRY_DELAY_MS });
            return;
        }

        clearRetry(userId);
        console.log(`[LicensedUser] ${client.user.tag} 유저 클라이언트 연결됨 (${client.commands.size} commands)`);
        startPartnerAutomationScheduler(client);
        startProfileSync(client);
    });

    client.on('error', error => {
        console.error(`[LicensedUser ${userId}]`, error.message);
    });

    client.on('invalidated', () => {
        console.error(`[LicensedUser ${userId}] session invalidated`);
        stopLicensedUserClient(userId, { backoffMs: RETRY_DELAY_MS }).catch(() => {});
    });

    try {
        await client.login(token);
    } catch (error) {
        console.error(`[LicensedUser ${userId}] 로그인 실패:`, error.message);
        await stopLicensedUserClient(userId, { backoffMs: RETRY_DELAY_MS });
        return null;
    }

    return entry;
}

async function reconcileLicensedUser(row) {
    const userId = row.user_id;
    if (isMasterUser(userId)) {
        await stopLicensedUserClient(userId);
        return;
    }

    const current = managedClients.get(userId);
    if (current && current.encryptedToken === row.token) {
        return;
    }

    if (current) {
        await stopLicensedUserClient(userId);
    }

    await startLicensedUserClient(userId, row.token);
}

async function syncLicensedUserClients() {
    const rows = await fetchActiveLicensedUsers();
    const activeUserIds = new Set(rows.map(row => row.user_id));

    for (const row of rows) {
        await reconcileLicensedUser(row);
    }

    for (const userId of [...managedClients.keys()]) {
        if (!activeUserIds.has(userId) || isMasterUser(userId)) {
            await stopLicensedUserClient(userId);
        }
    }
}

function startLicensedUserClientManager() {
    if (syncIntervalId) return syncIntervalId;

    const runSync = async () => {
        if (syncPromise) return syncPromise;

        syncPromise = syncLicensedUserClients()
            .catch(error => {
                console.error('[LicensedUserManager]', error.message);
            })
            .finally(() => {
                syncPromise = null;
            });

        return syncPromise;
    };

    syncIntervalId = setInterval(() => {
        runSync().catch(() => {});
    }, 60 * 1000);

    runSync().catch(() => {});
    return syncIntervalId;
}

async function refreshLicensedUserClient(userId) {
    if (!userId) return;

    const row = await fetchActiveLicensedUserRow(userId);
    if (!row || isMasterUser(userId)) {
        await stopLicensedUserClient(userId);
        return;
    }

    await reconcileLicensedUser(row);
}

async function refreshLicensedUserPresence(userId) {
    if (!userId) return false;

    const entry = managedClients.get(userId);
    if (!entry?.client?.user?.id) {
        return false;
    }

    await applyStoredProfileSettings(entry.client, { force: true });
    return true;
}

function getManagedLicensedUserCount() {
    return managedClients.size;
}

module.exports = {
    getManagedLicensedUserCount,
    refreshLicensedUserClient,
    refreshLicensedUserPresence,
    startLicensedUserClientManager
};
