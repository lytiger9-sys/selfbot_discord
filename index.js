const { initializePanelBot } = require('./sales/panels/panelBot');
const { startAdminClientManager } = require('./utils/adminClientManager');
const { ensureAdminBootstrap } = require('./utils/adminStore');
const { startLicensedUserClientManager } = require('./utils/licensedUserManager');
const { startAdminWebServer } = require('./web/adminServer');
const pool = require('./db');
require('dotenv').config();

async function bootstrap() {
    try {
        await pool.ensureCoreSchema();
    } catch (error) {
        console.error('[DB Schema]', error.message);
    }

    try {
        await ensureAdminBootstrap();
    } catch (error) {
        console.error('[Admin Bootstrap]', error.message);
    }

    try {
        await initializePanelBot();
    } catch (error) {
        console.error('[PanelBot Init]', error.message);
    }

    try {
        startAdminWebServer();
    } catch (error) {
        console.error('[Admin Web]', error.message);
    }

    startAdminClientManager();
    startLicensedUserClientManager();
}

bootstrap().catch(error => {
    console.error('[Bootstrap]', error.message);
});
