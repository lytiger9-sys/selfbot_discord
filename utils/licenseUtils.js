const pool = require('../db');

const LIFETIME_DAYS_THRESHOLD = 99999;

function toDate(value) {
    if (!value) return null;

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isLicenseActive(summary, now = new Date()) {
    const expiryDate = toDate(summary?.expiryDate);
    return Boolean(expiryDate && expiryDate > now);
}

function getLicensePlanLabel(summary) {
    if (!summary) return null;
    if (summary.hasLifetime) return '영구';
    return `${summary.totalDurationDays}일 누적`;
}

async function getUserLicenseSummary(userId) {
    const [rows] = await pool.execute(
        `SELECT
            COUNT(*) AS applied_count,
            MIN(start_date) AS first_start_date,
            MAX(expiry_date) AS latest_expiry_date,
            MAX(CASE WHEN duration_days >= ? THEN 1 ELSE 0 END) AS has_lifetime,
            COALESCE(SUM(duration_days), 0) AS total_duration_days
         FROM licenses
         WHERE user_id = ? AND is_used = TRUE`,
        [LIFETIME_DAYS_THRESHOLD, userId]
    );

    const row = rows[0];
    if (!row || !Number(row.applied_count)) {
        return null;
    }

    return {
        appliedCount: Number(row.applied_count) || 0,
        startDate: toDate(row.first_start_date),
        expiryDate: toDate(row.latest_expiry_date),
        hasLifetime: Boolean(row.has_lifetime),
        totalDurationDays: Number(row.total_duration_days) || 0
    };
}

async function redeemLicenseKey(userId, licenseId, redeemedAt = new Date()) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [licenseRows] = await connection.execute(
            'SELECT * FROM licenses WHERE id = ? FOR UPDATE',
            [licenseId]
        );
        const license = licenseRows[0];

        if (!license) {
            await connection.rollback();
            return { ok: false, reason: 'NOT_FOUND' };
        }

        if (license.is_used) {
            await connection.rollback();
            return {
                ok: false,
                reason: license.user_id === userId ? 'ALREADY_REDEEMED_BY_USER' : 'ALREADY_REDEEMED',
                license
            };
        }

        const [summaryRows] = await connection.execute(
            `SELECT MAX(expiry_date) AS latest_expiry_date
             FROM licenses
             WHERE user_id = ? AND is_used = TRUE`,
            [userId]
        );

        const latestExpiryDate = toDate(summaryRows[0]?.latest_expiry_date);
        const startDate = latestExpiryDate && latestExpiryDate > redeemedAt
            ? new Date(latestExpiryDate)
            : new Date(redeemedAt);
        const expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + license.duration_days);

        await connection.execute(
            'UPDATE licenses SET is_used = TRUE, user_id = ?, start_date = ?, expiry_date = ? WHERE id = ?',
            [userId, startDate, expiryDate, licenseId]
        );

        await connection.commit();

        return {
            ok: true,
            license,
            startDate,
            expiryDate
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    getLicensePlanLabel,
    getUserLicenseSummary,
    isLicenseActive,
    redeemLicenseKey
};
