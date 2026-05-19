const pool = require('../../db');
const { getManagedLicensedUserCount } = require('../../utils/licensedUserManager');

async function getPanelStatsSnapshot() {
    try {
        const [[licenseRow]] = await pool.execute(
            `SELECT
                COUNT(*) AS total_licenses,
                SUM(CASE WHEN is_used = TRUE AND expiry_date IS NOT NULL AND expiry_date > NOW() THEN 1 ELSE 0 END) AS active_licenses,
                COUNT(DISTINCT CASE WHEN is_used = TRUE AND user_id IS NOT NULL THEN user_id END) AS total_users
             FROM licenses`
        );

        return {
            activeSessions: getManagedLicensedUserCount(),
            activeLicenses: Number(licenseRow?.active_licenses) || 0,
            totalLicenses: Number(licenseRow?.total_licenses) || 0,
            totalUsers: Number(licenseRow?.total_users) || 0,
            updatedAt: new Date()
        };
    } catch (error) {
        return {
            activeSessions: getManagedLicensedUserCount(),
            activeLicenses: 0,
            totalLicenses: 0,
            totalUsers: 0,
            updatedAt: new Date()
        };
    }
}

module.exports = {
    getPanelStatsSnapshot
};
