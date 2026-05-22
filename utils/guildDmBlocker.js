const pool = require('../db');

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const syncIntervals = new WeakMap();

function normalizeId(value) {
    const id = String(value || '').trim();
    return id || null;
}

function normalizeIdList(values = []) {
    return [...new Set(
        values
            .map(value => normalizeId(value))
            .filter(Boolean)
    )];
}

function getRestrictedGuildIdsFromCache(client) {
    if (Array.isArray(client?.settings?.raw?.restricted_guilds)) {
        return normalizeIdList(client.settings.raw.restricted_guilds);
    }

    if (client?.settings?.disableDMfromGuilds && typeof client.settings.disableDMfromGuilds.keys === 'function') {
        return normalizeIdList([...client.settings.disableDMfromGuilds.keys()]);
    }

    return [];
}

async function loadRestrictedGuildIds(client) {
    const cachedIds = getRestrictedGuildIdsFromCache(client);

    try {
        await client.settings.fetch();
        return getRestrictedGuildIdsFromCache(client);
    } catch (error) {
        if (cachedIds.length > 0) {
            return cachedIds;
        }

        throw error;
    }
}

function buildMergedRestrictedGuildIds(currentIds, managedIds) {
    return normalizeIdList([...currentIds, ...managedIds]);
}

function buildToggledRestrictedGuildIds(currentIds, guildId, shouldBlock) {
    const nextIds = new Set(normalizeIdList(currentIds));

    if (shouldBlock) {
        nextIds.add(guildId);
    } else {
        nextIds.delete(guildId);
    }

    return [...nextIds];
}

function hasSameIds(left, right) {
    const leftIds = normalizeIdList(left).sort();
    const rightIds = normalizeIdList(right).sort();

    if (leftIds.length !== rightIds.length) {
        return false;
    }

    return leftIds.every((value, index) => value === rightIds[index]);
}

async function writeRestrictedGuildIds(client, guildIds) {
    const normalizedIds = normalizeIdList(guildIds);
    await client.settings.edit({ restricted_guilds: normalizedIds });
    return normalizedIds;
}

async function fetchManagedGuildDmBlockIds(userId) {
    const normalizedUserId = normalizeId(userId);
    if (!normalizedUserId) {
        return [];
    }

    const [rows] = await pool.execute(
        `SELECT guild_id
         FROM guild_dm_block_settings
         WHERE user_id = ?`,
        [normalizedUserId]
    );

    return normalizeIdList(rows.map(row => row.guild_id));
}

async function applyStoredGuildDmBlocks(client) {
    if (!client?.user?.id) {
        return false;
    }

    const managedGuildIds = (await fetchManagedGuildDmBlockIds(client.user.id))
        .filter(guildId => client.guilds.cache.has(guildId));

    if (managedGuildIds.length === 0) {
        return false;
    }

    const currentIds = await loadRestrictedGuildIds(client);
    const nextIds = buildMergedRestrictedGuildIds(currentIds, managedGuildIds);

    if (hasSameIds(currentIds, nextIds)) {
        return false;
    }

    await writeRestrictedGuildIds(client, nextIds);
    return true;
}

async function setGuildDmBlockEnabled(client, guildId, shouldBlock) {
    const normalizedGuildId = normalizeId(guildId);
    const normalizedUserId = normalizeId(client?.user?.id);

    if (!normalizedGuildId || !normalizedUserId) {
        throw new Error('GUILD_DM_BLOCK_TARGET_INVALID');
    }

    if (shouldBlock) {
        await pool.execute(
            `INSERT INTO guild_dm_block_settings (user_id, guild_id)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE
             updated_at = CURRENT_TIMESTAMP`,
            [normalizedUserId, normalizedGuildId]
        );
    } else {
        await pool.execute(
            `DELETE FROM guild_dm_block_settings
             WHERE user_id = ?
               AND guild_id = ?`,
            [normalizedUserId, normalizedGuildId]
        );
    }

    const currentIds = await loadRestrictedGuildIds(client);
    const nextIds = buildToggledRestrictedGuildIds(currentIds, normalizedGuildId, shouldBlock);

    if (hasSameIds(currentIds, nextIds)) {
        return false;
    }

    await writeRestrictedGuildIds(client, nextIds);
    return true;
}

function startGuildDmBlockScheduler(client) {
    if (syncIntervals.has(client)) {
        return syncIntervals.get(client);
    }

    const sync = () => applyStoredGuildDmBlocks(client).catch(error => {
        console.error(`[GuildDmBlocker] ${client.user?.id || 'unknown'}`, error.message);
    });

    const intervalId = setInterval(sync, SYNC_INTERVAL_MS);
    syncIntervals.set(client, intervalId);
    sync();

    return intervalId;
}

function stopGuildDmBlockScheduler(client) {
    const intervalId = syncIntervals.get(client);
    if (!intervalId) {
        return;
    }

    clearInterval(intervalId);
    syncIntervals.delete(client);
}

module.exports = {
    applyStoredGuildDmBlocks,
    setGuildDmBlockEnabled,
    startGuildDmBlockScheduler,
    stopGuildDmBlockScheduler
};
