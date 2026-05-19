const pool = require('../../db');

async function savePanelMessage(channelId, messageId) {
    await pool.execute(
        `INSERT INTO panel_messages (
            message_id,
            channel_id,
            last_refreshed_at
        )
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE
         channel_id = VALUES(channel_id),
         last_refreshed_at = NOW()`,
        [messageId, channelId]
    );
}

async function fetchPanelMessagesNeedingRefresh() {
    const [rows] = await pool.execute(
        `SELECT message_id, channel_id
         FROM panel_messages
         WHERE last_refreshed_at IS NULL
            OR last_refreshed_at <= DATE_SUB(NOW(), INTERVAL 1 DAY)`
    );

    return rows;
}

async function markPanelMessageRefreshed(messageId) {
    await pool.execute(
        `UPDATE panel_messages
         SET last_refreshed_at = NOW()
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
