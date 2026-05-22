const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bot_db',
    waitForConnections: true,
    connectionLimit: 10
});

let schemaEnsured = false;
let schemaPromise = null;

async function hasColumn(tableName, columnName) {
    const [rows] = await pool.execute(
        `SELECT 1
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?
         LIMIT 1`,
        [tableName, columnName]
    );

    return rows.length > 0;
}

async function hasIndex(tableName, indexName) {
    const [rows] = await pool.execute(
        `SELECT 1
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND INDEX_NAME = ?
         LIMIT 1`,
        [tableName, indexName]
    );

    return rows.length > 0;
}

async function ensureColumn(tableName, columnName, definition) {
    if (await hasColumn(tableName, columnName)) return;
    await pool.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

async function ensureIndex(tableName, indexName, definitionSql) {
    if (await hasIndex(tableName, indexName)) return;
    await pool.execute(`ALTER TABLE ${tableName} ADD ${definitionSql}`);
}

async function migrateLicensesTable() {
    await ensureColumn('licenses', 'user_id', 'VARCHAR(50) DEFAULT NULL');
    await ensureColumn('licenses', 'token', 'TEXT DEFAULT NULL');
    await ensureColumn('licenses', 'start_date', 'DATETIME DEFAULT NULL');
    await ensureColumn('licenses', 'expiry_date', 'DATETIME DEFAULT NULL');
    await ensureColumn('licenses', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    const hasUsedBy = await hasColumn('licenses', 'used_by');
    const hasUsedAt = await hasColumn('licenses', 'used_at');

    if (hasUsedBy) {
        await pool.execute(
            `UPDATE licenses
             SET user_id = COALESCE(user_id, used_by)
             WHERE user_id IS NULL
               AND used_by IS NOT NULL`
        );
    }

    if (hasUsedAt) {
        await pool.execute(
            `UPDATE licenses
             SET start_date = COALESCE(start_date, used_at)
             WHERE start_date IS NULL
               AND used_at IS NOT NULL`
        );

        await pool.execute(
            `UPDATE licenses
             SET expiry_date = DATE_ADD(used_at, INTERVAL duration_days DAY)
             WHERE expiry_date IS NULL
               AND used_at IS NOT NULL
               AND duration_days IS NOT NULL`
        );
    }
}

async function migrateUserSettingsTable() {
    await ensureColumn('user_settings', 'rpc_text', 'TEXT');
    await ensureColumn('user_settings', 'rpc_text_1', 'TEXT');
    await ensureColumn('user_settings', 'rpc_text_2', 'TEXT');
    await ensureColumn('user_settings', 'streaming_details', 'TEXT');
    await ensureColumn('user_settings', 'streaming_elapsed_seconds', 'INT DEFAULT NULL');
    await ensureColumn('user_settings', 'streaming_button_label', 'VARCHAR(64) DEFAULT NULL');
    await ensureColumn('user_settings', 'streaming_button_url', 'TEXT DEFAULT NULL');
    await ensureColumn('user_settings', 'streaming_button_label_2', 'VARCHAR(64) DEFAULT NULL');
    await ensureColumn('user_settings', 'streaming_button_url_2', 'TEXT DEFAULT NULL');
    await ensureColumn('user_settings', 'streaming_large_image_url', 'TEXT');
    await ensureColumn('user_settings', 'streaming_small_image_url', 'TEXT');
    await ensureColumn('user_settings', 'rpc_details_1', 'TEXT');
    await ensureColumn('user_settings', 'rpc_elapsed_seconds_1', 'INT DEFAULT NULL');
    await ensureColumn('user_settings', 'rpc_button_label_1', 'VARCHAR(64) DEFAULT NULL');
    await ensureColumn('user_settings', 'rpc_button_url_1', 'TEXT DEFAULT NULL');
    await ensureColumn('user_settings', 'rpc_large_image_url', 'TEXT');
    await ensureColumn('user_settings', 'rpc_small_image_url', 'TEXT');
    await ensureColumn('user_settings', 'rpc_details_2', 'TEXT');
    await ensureColumn('user_settings', 'rpc_elapsed_seconds_2', 'INT DEFAULT NULL');
    await ensureColumn('user_settings', 'rpc_button_label_2', 'VARCHAR(64) DEFAULT NULL');
    await ensureColumn('user_settings', 'rpc_button_url_2', 'TEXT DEFAULT NULL');
    await ensureColumn('user_settings', 'activity_button_1_label', 'VARCHAR(64) DEFAULT NULL');
    await ensureColumn('user_settings', 'activity_button_1_url', 'TEXT DEFAULT NULL');
    await ensureColumn('user_settings', 'activity_button_2_label', 'VARCHAR(64) DEFAULT NULL');
    await ensureColumn('user_settings', 'activity_button_2_url', 'TEXT DEFAULT NULL');

    const hasLegacyRpcText = await hasColumn('user_settings', 'rpc_text');
    if (hasLegacyRpcText) {
        await pool.execute(
            `UPDATE user_settings
             SET rpc_text_1 = COALESCE(rpc_text_1, rpc_text)
             WHERE rpc_text IS NOT NULL`
        );
    }

    await pool.execute(
        `UPDATE user_settings
         SET rpc_text_1 = COALESCE(rpc_text_1, rpc_text_2),
             rpc_details_1 = COALESCE(rpc_details_1, rpc_details_2),
             rpc_elapsed_seconds_1 = COALESCE(rpc_elapsed_seconds_1, rpc_elapsed_seconds_2),
             rpc_button_label_1 = COALESCE(rpc_button_label_1, rpc_button_label_2),
             rpc_button_url_1 = COALESCE(rpc_button_url_1, rpc_button_url_2)
         WHERE rpc_text_2 IS NOT NULL
            OR rpc_details_2 IS NOT NULL
            OR rpc_elapsed_seconds_2 IS NOT NULL
            OR rpc_button_label_2 IS NOT NULL
            OR rpc_button_url_2 IS NOT NULL`
    );

    await pool.execute(
        `UPDATE user_settings
         SET streaming_large_image_url = COALESCE(streaming_large_image_url, large_image_url),
             streaming_small_image_url = COALESCE(streaming_small_image_url, small_image_url),
             rpc_large_image_url = COALESCE(rpc_large_image_url, large_image_url),
             rpc_small_image_url = COALESCE(rpc_small_image_url, small_image_url)
         WHERE large_image_url IS NOT NULL
            OR small_image_url IS NOT NULL`
    );

    await pool.execute(
        `UPDATE user_settings
         SET streaming_button_label = COALESCE(streaming_button_label, activity_button_1_label),
             streaming_button_url = COALESCE(streaming_button_url, activity_button_1_url),
             streaming_button_label_2 = COALESCE(streaming_button_label_2, activity_button_2_label),
             streaming_button_url_2 = COALESCE(streaming_button_url_2, activity_button_2_url),
             rpc_button_label_1 = COALESCE(rpc_button_label_1, activity_button_1_label),
             rpc_button_url_1 = COALESCE(rpc_button_url_1, activity_button_1_url),
             rpc_button_label_2 = COALESCE(rpc_button_label_2, activity_button_2_label),
             rpc_button_url_2 = COALESCE(rpc_button_url_2, activity_button_2_url)
         WHERE activity_button_1_label IS NOT NULL
            OR activity_button_1_url IS NOT NULL
            OR activity_button_2_label IS NOT NULL
            OR activity_button_2_url IS NOT NULL`
    );
}

async function migrateAdminAccountsTable() {
    await ensureColumn('admin_accounts', 'display_name', 'VARCHAR(255) DEFAULT NULL');
    await ensureColumn('admin_accounts', 'encrypted_token', 'TEXT DEFAULT NULL');
    await ensureColumn('admin_accounts', 'appointed_by', 'VARCHAR(50) DEFAULT NULL');
    await ensureColumn('admin_accounts', 'appointed_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    await ensureColumn('admin_accounts', 'last_login_at', 'DATETIME DEFAULT NULL');
    await ensureColumn('admin_accounts', 'is_active', 'BOOLEAN DEFAULT TRUE');
    await ensureColumn('admin_accounts', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await ensureColumn('admin_accounts', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
}

async function migratePanelMessagesTable() {
    await ensureColumn('panel_messages', 'channel_id', 'VARCHAR(50) NOT NULL');
    await ensureColumn('panel_messages', 'last_refreshed_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    await ensureColumn('panel_messages', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
}

async function migrateGuildDmBlockSettingsTable() {
    await ensureColumn('guild_dm_block_settings', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await ensureColumn('guild_dm_block_settings', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
}

async function ensureCoreSchema() {
    if (schemaEnsured) return;
    if (schemaPromise) return schemaPromise;

    schemaPromise = (async () => {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS licenses (
                id VARCHAR(50) PRIMARY KEY,
                duration_days INT NOT NULL,
                is_used BOOLEAN DEFAULT FALSE,
                user_id VARCHAR(50) DEFAULT NULL,
                token TEXT DEFAULT NULL,
                start_date DATETIME DEFAULT NULL,
                expiry_date DATETIME DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await migrateLicensesTable();

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id VARCHAR(50) PRIMARY KEY,
                afk_enabled BOOLEAN DEFAULT FALSE,
                afk_message TEXT,
                partner_message TEXT,
                streaming_text TEXT,
                streaming_details TEXT,
                streaming_elapsed_seconds INT DEFAULT NULL,
                streaming_button_label VARCHAR(64) DEFAULT NULL,
                streaming_button_url TEXT,
                streaming_button_label_2 VARCHAR(64) DEFAULT NULL,
                streaming_button_url_2 TEXT,
                streaming_large_image_url TEXT,
                streaming_small_image_url TEXT,
                rpc_text TEXT,
                rpc_text_1 TEXT,
                rpc_details_1 TEXT,
                rpc_elapsed_seconds_1 INT DEFAULT NULL,
                rpc_button_label_1 VARCHAR(64) DEFAULT NULL,
                rpc_button_url_1 TEXT,
                rpc_large_image_url TEXT,
                rpc_small_image_url TEXT,
                rpc_text_2 TEXT,
                rpc_details_2 TEXT,
                rpc_elapsed_seconds_2 INT DEFAULT NULL,
                rpc_button_label_2 VARCHAR(64) DEFAULT NULL,
                rpc_button_url_2 TEXT,
                large_image_url TEXT,
                small_image_url TEXT,
                activity_button_1_label VARCHAR(64) DEFAULT NULL,
                activity_button_1_url TEXT,
                activity_button_2_label VARCHAR(64) DEFAULT NULL,
                activity_button_2_url TEXT,
                token TEXT
            )
        `);
        await migrateUserSettingsTable();

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS partner_servers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50),
                channel_id VARCHAR(50),
                UNIQUE KEY unique_partner_channel_per_user (user_id, channel_id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await ensureIndex(
            'partner_servers',
            'unique_partner_channel_per_user',
            'UNIQUE KEY unique_partner_channel_per_user (user_id, channel_id)'
        );
        await ensureColumn('partner_servers', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS partner_automation_settings (
                user_id VARCHAR(50) PRIMARY KEY,
                enabled BOOLEAN DEFAULT FALSE,
                last_sent_at DATETIME DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS admin_accounts (
                user_id VARCHAR(50) PRIMARY KEY,
                display_name VARCHAR(255) DEFAULT NULL,
                encrypted_token TEXT DEFAULT NULL,
                appointed_by VARCHAR(50) DEFAULT NULL,
                appointed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login_at DATETIME DEFAULT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        await migrateAdminAccountsTable();

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS panel_messages (
                message_id VARCHAR(50) PRIMARY KEY,
                channel_id VARCHAR(50) NOT NULL,
                last_refreshed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await migratePanelMessagesTable();

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS guild_dm_block_settings (
                user_id VARCHAR(50) NOT NULL,
                guild_id VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, guild_id)
            )
        `);
        await migrateGuildDmBlockSettingsTable();

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS guild_templates (
                owner_id VARCHAR(50) PRIMARY KEY,
                source_guild_id VARCHAR(50) NOT NULL,
                source_guild_name VARCHAR(255) NOT NULL,
                template_data LONGTEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS role_templates (
                owner_id VARCHAR(50) PRIMARY KEY,
                source_guild_id VARCHAR(50) NOT NULL,
                source_guild_name VARCHAR(255) NOT NULL,
                role_data LONGTEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        schemaEnsured = true;
    })().finally(() => {
        if (!schemaEnsured) {
            schemaPromise = null;
        }
    });

    return schemaPromise;
}

pool.ensureCoreSchema = ensureCoreSchema;

module.exports = pool;
