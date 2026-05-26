const pool = require('../db');
const { formatDateTime, toDate } = require('./dateTime');
const {
    fetchChannel,
    isTextCommandChannel,
    sendMessage
} = require('./commandUtils');

const DAY_MS = 24 * 60 * 60 * 1000;
const runningUsers = new Set();
const schedulerIntervals = new WeakMap();

async function getAutomationRow(userId) {
    const [rows] = await pool.execute(
        'SELECT enabled, last_sent_at FROM partner_automation_settings WHERE user_id = ?',
        [userId]
    );

    return rows[0] || null;
}

async function setAutomationState(userId, enabled, lastSentAt = null) {
    await pool.execute(
        `INSERT INTO partner_automation_settings (user_id, enabled, last_sent_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), last_sent_at = VALUES(last_sent_at)`,
        [userId, enabled, lastSentAt]
    );
}

async function markAutomationSent(userId, enabled) {
    await pool.execute(
        `INSERT INTO partner_automation_settings (user_id, enabled, last_sent_at)
         VALUES (?, ?, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), last_sent_at = UTC_TIMESTAMP()`,
        [userId, enabled]
    );

    return getAutomationRow(userId);
}

async function getPartnerOverview(userId) {
    const [messageRows] = await pool.execute(
        'SELECT partner_message FROM user_settings WHERE user_id = ?',
        [userId]
    );
    const [channelRows] = await pool.execute(
        'SELECT COUNT(*) AS count FROM partner_servers WHERE user_id = ?',
        [userId]
    );
    const automation = await getAutomationRow(userId);

    return {
        hasMessage: Boolean(messageRows[0]?.partner_message),
        channelCount: channelRows[0]?.count || 0,
        enabled: Boolean(automation?.enabled),
        lastSentAt: automation?.last_sent_at || null
    };
}

function isDue(lastSentAt) {
    if (!lastSentAt) return true;

    const last = toDate(lastSentAt);
    if (!last) return true;

    return Date.now() - last.getTime() >= DAY_MS;
}

async function broadcastPartnerMessage(client, userId, { enableAutomation = true, respectCooldown = true } = {}) {
    if (runningUsers.has(userId)) {
        return { ok: false, reason: 'RUNNING' };
    }

    runningUsers.add(userId);

    try {
        const [messageRows] = await pool.execute(
            'SELECT partner_message FROM user_settings WHERE user_id = ?',
            [userId]
        );
        const partnerMessage = messageRows[0]?.partner_message;
        if (!partnerMessage) {
            return { ok: false, reason: 'NO_MESSAGE' };
        }

        const automation = await getAutomationRow(userId);
        if (respectCooldown && automation?.last_sent_at && !isDue(automation.last_sent_at)) {
            return {
                ok: false,
                reason: 'COOLDOWN',
                lastSentAt: automation.last_sent_at
            };
        }

        const [channelRows] = await pool.execute(
            'SELECT channel_id FROM partner_servers WHERE user_id = ? ORDER BY id ASC',
            [userId]
        );
        if (channelRows.length === 0) {
            return { ok: false, reason: 'NO_CHANNELS' };
        }

        let successCount = 0;
        let failCount = 0;

        for (const row of channelRows) {
            try {
                const channel = await fetchChannel(client, row.channel_id).catch(() => null);
                if (!channel || !isTextCommandChannel(channel)) {
                    failCount += 1;
                    continue;
                }

                await sendMessage(channel, partnerMessage);
                successCount += 1;
            } catch (error) {
                failCount += 1;
            }
        }

        if (successCount === 0) {
            return {
                ok: false,
                reason: 'ALL_FAILED',
                successCount,
                failCount
            };
        }

        const updatedAutomation = await markAutomationSent(userId, enableAutomation);

        return {
            ok: true,
            successCount,
            failCount,
            lastSentAt: updatedAutomation?.last_sent_at || null
        };
    } finally {
        runningUsers.delete(userId);
    }
}

function startPartnerAutomationScheduler(client) {
    if (schedulerIntervals.has(client)) {
        return schedulerIntervals.get(client);
    }

    const tick = async () => {
        const userId = client.user?.id;
        if (!userId) return;

        try {
            const automation = await getAutomationRow(userId);
            if (!automation?.enabled) return;
            if (!isDue(automation.last_sent_at)) return;

            const result = await broadcastPartnerMessage(client, userId, {
                enableAutomation: true,
                respectCooldown: false
            });

            if (!result.ok && result.reason === 'ALL_FAILED') {
                console.warn(`[PartnerScheduler] ${userId} all partner sends failed.`);
            }
        } catch (error) {
            console.error(`[PartnerScheduler] ${userId}`, error.message);
        }
    };

    const intervalId = setInterval(() => {
        tick().catch(error => console.error('[PartnerScheduler]', error.message));
    }, 60 * 1000);

    schedulerIntervals.set(client, intervalId);
    tick().catch(error => console.error('[PartnerScheduler]', error.message));

    return intervalId;
}

function stopPartnerAutomationScheduler(client) {
    const intervalId = schedulerIntervals.get(client);
    if (!intervalId) return;

    clearInterval(intervalId);
    schedulerIntervals.delete(client);
}

module.exports = {
    broadcastPartnerMessage,
    formatDateTime,
    getPartnerOverview,
    setAutomationState,
    startPartnerAutomationScheduler,
    stopPartnerAutomationScheduler
};
