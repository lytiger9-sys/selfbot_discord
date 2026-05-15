const { Client } = require('discord.js-selfbot-v13');
const { decrypt } = require('../cryptoUtils');
const {
    fetchRuntimeAdminAccounts,
    getAdminAccount,
    getSuperAdminId
} = require('./adminStore');
const {
    attachCommandMessageHandler,
    createCommandCollection
} = require('./commandRuntime');
const {
    startPartnerAutomationScheduler,
    stopPartnerAutomationScheduler
} = require('./partnerAutomation');
const {
    startProfileSync,
    stopProfileSync
} = require('./profileSync');

const managedClients = new Map();
const retryAfterMap = new Map();
const RETRY_DELAY_MS = 5 * 60 * 1000;

let syncIntervalId = null;
let syncPromise = null;

function canRetry(userId) {
    return Date.now() >= (retryAfterMap.get(userId) || 0);
}

function markRetry(userId, delayMs = RETRY_DELAY_MS) {
    retryAfterMap.set(userId, Date.now() + delayMs);
}

function clearRetry(userId) {
    retryAfterMap.delete(userId);
}

async function stopAdminClient(userId, { backoffMs = 0 } = {}) {
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

async function startAdminClient(row) {
    const userId = String(row.user_id);
    if (managedClients.has(userId)) return managedClients.get(userId);
    if (!canRetry(userId)) return null;

    let token;
    try {
        token = decrypt(row.encrypted_token);
    } catch (error) {
        console.error(`[AdminClient ${userId}] token decrypt failed:`, error.message);
        markRetry(userId);
        return null;
    }

    if (!token) {
        markRetry(userId);
        return null;
    }

    const client = new Client({ checkUpdate: false });
    client.commands = createCommandCollection({ includeAdminCommands: true });
    attachCommandMessageHandler(client);

    const entry = {
        client,
        encryptedToken: row.encrypted_token
    };

    managedClients.set(userId, entry);

    client.once('ready', async () => {
        if (client.user?.id !== userId) {
            console.error(`[AdminClient ${userId}] token owner mismatch: logged in as ${client.user?.id}`);
            await stopAdminClient(userId, { backoffMs: RETRY_DELAY_MS });
            return;
        }

        clearRetry(userId);
        const label = row.display_name || (userId === getSuperAdminId() ? 'SuperAdmin' : 'Admin');
        console.log(`[${label}] ${client.user.tag} 관리자 클라이언트 연결됨 (${client.commands.size} commands)`);
        startPartnerAutomationScheduler(client);
        startProfileSync(client);
    });

    client.on('error', error => {
        console.error(`[AdminClient ${userId}]`, error.message);
    });

    client.on('invalidated', () => {
        console.error(`[AdminClient ${userId}] session invalidated`);
        stopAdminClient(userId, { backoffMs: RETRY_DELAY_MS }).catch(() => {});
    });

    try {
        await client.login(token);
    } catch (error) {
        console.error(`[AdminClient ${userId}] 로그인 실패:`, error.message);
        await stopAdminClient(userId, { backoffMs: RETRY_DELAY_MS });
        return null;
    }

    return entry;
}

async function reconcileAdminClient(row) {
    const userId = String(row.user_id);
    const current = managedClients.get(userId);

    if (current && current.encryptedToken === row.encrypted_token) {
        return;
    }

    if (current) {
        await stopAdminClient(userId);
    }

    await startAdminClient(row);
}

async function syncAdminClients() {
    const rows = await fetchRuntimeAdminAccounts();
    const activeUserIds = new Set(rows.map(row => String(row.user_id)));

    for (const row of rows) {
        await reconcileAdminClient(row);
    }

    for (const userId of [...managedClients.keys()]) {
        if (!activeUserIds.has(userId)) {
            await stopAdminClient(userId);
        }
    }
}

function startAdminClientManager() {
    if (syncIntervalId) return syncIntervalId;

    const runSync = async () => {
        if (syncPromise) return syncPromise;

        syncPromise = syncAdminClients()
            .catch(error => {
                console.error('[AdminClientManager]', error.message);
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

async function refreshAdminClient(userId) {
    if (!userId) return;

    const row = await getAdminAccount(userId);
    if (!row?.is_active || !row.encrypted_token) {
        await stopAdminClient(String(userId));
        return;
    }

    await reconcileAdminClient(row);
}

module.exports = {
    refreshAdminClient,
    startAdminClientManager
};
