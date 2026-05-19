const fs = require('fs');
const path = require('path');
const { Client, Collection, Intents } = require('discord.js');
const { createPanel } = require('./embed/embedBuilders');
const { refreshTrackedPanels, trackPanelMessage } = require('./panelRefresher');
const {
    getUserLicenseSummary,
    isLicenseActive
} = require('../../utils/licenseUtils');

const PANEL_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

let panelBotClient = null;
let panelBotReady = false;
let panelBotInitStarted = false;
let panelBotLoginPromise = null;
let panelRefreshIntervalId = null;
let panelRefreshPromise = null;

function getBotToken() {
    return process.env.BOT_TOKEN || process.env.PANEL_BOT_TOKEN || '';
}

function loadPanelModules(collection, modalCollection) {
    const buttonsDir = path.join(__dirname, 'buttons');
    if (!fs.existsSync(buttonsDir)) return;

    for (const file of fs.readdirSync(buttonsDir)) {
        if (!file.endsWith('.js')) continue;

        const modulePath = path.join(buttonsDir, file);
        const item = require(modulePath);

        if (item?.customId) {
            collection.set(item.customId, item);
        }

        if (item?.modalCustomId) {
            modalCollection.set(item.modalCustomId, item);
        }
    }
}

function stopPanelRefreshScheduler() {
    if (panelRefreshIntervalId) {
        clearInterval(panelRefreshIntervalId);
        panelRefreshIntervalId = null;
    }

    panelRefreshPromise = null;
}

function resetPanelBotState(destroyClient = false) {
    panelBotReady = false;
    panelBotInitStarted = false;
    panelBotLoginPromise = null;
    stopPanelRefreshScheduler();

    if (destroyClient && panelBotClient) {
        try {
            panelBotClient.removeAllListeners();
            panelBotClient.destroy();
        } catch (error) {
            // noop
        }
        panelBotClient = null;
    }
}

async function runPanelRefresh(client = panelBotClient) {
    if (!client) {
        return false;
    }

    if (panelRefreshPromise) {
        return panelRefreshPromise;
    }

    panelRefreshPromise = refreshTrackedPanels(client)
        .catch(error => {
            console.error('[PanelRefresh]', error.message);
            return false;
        })
        .finally(() => {
            panelRefreshPromise = null;
        });

    return panelRefreshPromise;
}

function startPanelRefreshScheduler(client) {
    if (panelRefreshIntervalId) {
        return panelRefreshIntervalId;
    }

    panelRefreshIntervalId = setInterval(() => {
        runPanelRefresh(client).catch(() => {});
    }, PANEL_REFRESH_INTERVAL_MS);

    runPanelRefresh(client).catch(() => {});
    return panelRefreshIntervalId;
}

function attachPanelBotEvents(client) {
    client.on('ready', () => {
        panelBotReady = true;
        startPanelRefreshScheduler(client);
        console.log(`[PanelBot] ${client.user.tag} 패널 봇이 준비되었습니다.`);
    });

    client.on('interactionCreate', async interaction => {
        try {
            if (interaction.isButton()) {
                if (interaction.channelId && interaction.message?.id) {
                    trackPanelMessage(interaction.channelId, interaction.message.id).catch(() => {});
                }

                const handler = client.panelButtons.get(interaction.customId)
                    || client.panelButtons.find(item => interaction.customId.startsWith(item.customId));

                if (handler?.requiresActiveLicense) {
                    const summary = await getUserLicenseSummary(interaction.user.id);
                    const hasActiveLicense = isLicenseActive(summary);

                    if (!hasActiveLicense) {
                        await interaction.reply({
                            content: '이 기능은 활성 라이센스가 있어야 사용할 수 있습니다. 먼저 `라이센스 인증`으로 활성화해 주세요.',
                            ephemeral: true
                        });
                        return;
                    }
                }

                if (handler?.execute) {
                    await handler.execute(interaction);
                }
                return;
            }

            if (interaction.isModalSubmit()) {
                const handler = client.panelModals.get(interaction.customId)
                    || client.panelModals.find(item => interaction.customId.startsWith(item.modalCustomId));

                if (handler?.requiresActiveLicense) {
                    const summary = await getUserLicenseSummary(interaction.user.id);
                    const hasActiveLicense = isLicenseActive(summary);

                    if (!hasActiveLicense) {
                        await interaction.reply({
                            content: '활성 라이센스가 없어 설정을 저장할 수 없습니다. 먼저 `라이센스 인증`을 완료해 주세요.',
                            ephemeral: true
                        });
                        return;
                    }
                }

                if (handler?.handleModalSubmit) {
                    await handler.handleModalSubmit(interaction);
                }
            }
        } catch (error) {
            console.error('[PanelBot Interaction]', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '요청 처리 중 오류가 발생했습니다.', ephemeral: true }).catch(() => {});
            }
        }
    });

    client.on('error', error => {
        panelBotReady = false;
        console.error('[PanelBot Error]', error.message);
    });

    client.on('shardDisconnect', event => {
        panelBotReady = false;
        console.error('[PanelBot Disconnect]', event?.code || 'unknown');
    });

    client.on('shardResume', () => {
        panelBotReady = true;
        startPanelRefreshScheduler(client);
        console.log('[PanelBot] 연결이 복구되었습니다.');
    });
}

function waitForPanelBotReady(timeoutMs = 10000) {
    if (panelBotReady && panelBotClient) {
        return Promise.resolve(true);
    }

    return new Promise(resolve => {
        const client = panelBotClient;

        if (!client) {
            resolve(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            cleanup(false);
        }, timeoutMs);

        const onReady = () => cleanup(true);
        const onError = () => cleanup(false);

        function cleanup(result) {
            clearTimeout(timeoutId);
            client.off('ready', onReady);
            client.off('error', onError);
            resolve(result);
        }

        client.on('ready', onReady);
        client.on('error', onError);
    });
}

async function initializePanelBot() {
    const botToken = getBotToken();
    if (!botToken) return null;

    if (panelBotLoginPromise) {
        return panelBotLoginPromise;
    }

    if (panelBotClient && panelBotInitStarted) {
        return panelBotLoginPromise || panelBotClient;
    }

    panelBotInitStarted = true;
    panelBotReady = false;
    panelBotClient = new Client({
        intents: [Intents.FLAGS.GUILDS]
    });
    panelBotClient.panelButtons = new Collection();
    panelBotClient.panelModals = new Collection();
    loadPanelModules(panelBotClient.panelButtons, panelBotClient.panelModals);
    attachPanelBotEvents(panelBotClient);

    panelBotLoginPromise = panelBotClient.login(botToken)
        .then(() => panelBotClient)
        .catch(error => {
            console.error('[PanelBot Login]', error.message);
            resetPanelBotState(true);
            throw error;
        })
        .finally(() => {
            panelBotLoginPromise = null;
        });

    return panelBotLoginPromise;
}

function isPanelBotConfigured() {
    return Boolean(getBotToken());
}

function isPanelBotReady() {
    return Boolean(panelBotClient && panelBotReady);
}

async function postPanelToChannel(channelId) {
    if (!isPanelBotReady()) {
        await initializePanelBot().catch(() => null);
        const becameReady = await waitForPanelBotReady();
        if (!becameReady) {
            throw new Error('PANEL_BOT_NOT_READY');
        }
    }

    const channel = await panelBotClient.channels.fetch(channelId);
    if (!channel || typeof channel.send !== 'function') {
        throw new Error('INVALID_PANEL_CHANNEL');
    }

    const message = await channel.send(await createPanel());
    await trackPanelMessage(channelId, message.id).catch(() => {});
    return message;
}

module.exports = {
    initializePanelBot,
    isPanelBotConfigured,
    isPanelBotReady,
    postPanelToChannel
};
