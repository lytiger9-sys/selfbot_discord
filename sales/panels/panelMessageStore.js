const pool = require('../../db');
const { getPanelRefreshCutoff } = require('./panelRefreshConfig');

async function savePanelMessage(channelId, messageId) {
    await pool.execute(
        `INSERT INTO panel_messages (
            message_id,
            channel_id,
            last_refreshed_at,
            last_seen_at
        )
         VALUES (?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE
         channel_id = VALUES(channel_id),
         last_seen_at = UTC_TIMESTAMP()`,
        [messageId, channelId]
    );
}

async function fetchPanelMessagesNeedingRefresh() {
    const refreshCutoff = getPanelRefreshCutoff();
    const [rows] = await pool.execute(
        `SELECT message_id, channel_id
         FROM panel_messages
         WHERE last_refreshed_at IS NULL
            OR last_refreshed_at <= ?
         ORDER BY COALESCE(last_refreshed_at, created_at) ASC`,
        [refreshCutoff]
    );

    return rows;
}

async function markPanelMessageRefreshed(messageId) {
    await pool.execute(
        `UPDATE panel_messages
         SET last_refreshed_at = UTC_TIMESTAMP(),
             last_seen_at = UTC_TIMESTAMP()
         WHERE message_id = ?`,
        [messageId]
    );
}

async function deletePanelMessage(messageId) {
    await pool.execute(
        `DELETE FROM panel_messages
         WHERE message_id = ?`,
        [messageId]
    );
}

module.exports = {
    deletePanelMessage,
    fetchPanelMessagesNeedingRefresh,
    markPanelMessageRefreshed,
    savePanelMessage
};
