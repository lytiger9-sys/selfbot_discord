const { initializePanelBot } = require('./sales/panels/panelBot');
const { startAdminClientManager } = require('./utils/adminClientManager');
const { ensureAdminBootstrap } = require('./utils/adminStore');
const { startLicensedUserClientManager } = require('./utils/licensedUserManager');
const { startAdminWebServer } = require('./web/adminServer');
const pool = require('./db');
require('dotenv').config();

function describeStartupError(error) {
    if (error instanceof AggregateError) {
        return {
            name: error.name,
            message: error.message,
            errors: error.errors?.map(item => ({
                name: item?.name || '',
                message: item?.message || '',
                code: item?.code || '',
                errno: item?.errno || ''
            })) || []
        };
    }

    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            code: error.code || '',
            errno: error.errno || '',
            stack: error.stack
        };
    }

    return error;
}

async function bootstrap() {
    try {
        await pool.ensureCoreSchema();
    } catch (error) {
        console.error('[DB Schema]', describeStartupError(error));
    }

    try {
        await ensureAdminBootstrap();
    } catch (error) {
        console.error('[Admin Bootstrap]', describeStartupError(error));
    }

    try {
        await initializePanelBot();
    } catch (error) {
        console.error('[PanelBot Init]', describeStartupError(error));
    }

    try {
        startAdminWebServer();
    } catch (error) {
        console.error('[Admin Web]', describeStartupError(error));
    }

    startAdminClientManager();
    startLicensedUserClientManager();
}

bootstrap().catch(error => {
    console.error('[Bootstrap]', describeStartupError(error));
});
