const pool = require('../db');
const { normalizeOptionalText } = require('./activitySettings');

async function fetchActivityUserSettings(userId) {
    const [rows] = await pool.execute(
        `SELECT *
         FROM user_settings
         WHERE user_id = ?`,
        [userId]
    );

    return rows[0] || {};
}

function toModalValue(value) {
    return normalizeOptionalText(value) || '';
}

module.exports = {
    fetchActivityUserSettings,
    toModalValue
};
