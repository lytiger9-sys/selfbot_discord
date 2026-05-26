const DEFAULT_PANEL_REFRESH_HOURS = 12;
const DEFAULT_PANEL_REFRESH_CHECK_MINUTES = 60;

function parsePositiveInteger(value, fallback) {
    const parsed = Number.parseInt(String(value || '').trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const PANEL_REFRESH_INTERVAL_HOURS = parsePositiveInteger(
    process.env.PANEL_REFRESH_INTERVAL_HOURS,
    DEFAULT_PANEL_REFRESH_HOURS
);

const PANEL_REFRESH_INTERVAL_MS = PANEL_REFRESH_INTERVAL_HOURS * 60 * 60 * 1000;
const PANEL_REFRESH_CHECK_INTERVAL_MS = parsePositiveInteger(
    process.env.PANEL_REFRESH_CHECK_MINUTES,
    DEFAULT_PANEL_REFRESH_CHECK_MINUTES
) * 60 * 1000;

function getPanelRefreshCutoff(now = Date.now()) {
    return new Date(now - PANEL_REFRESH_INTERVAL_MS);
}

module.exports = {
    PANEL_REFRESH_CHECK_INTERVAL_MS,
    PANEL_REFRESH_INTERVAL_HOURS,
    PANEL_REFRESH_INTERVAL_MS,
    getPanelRefreshCutoff
};
