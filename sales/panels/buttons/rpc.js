const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const {
    formatElapsedSeconds,
    normalizeOptionalText,
    parseElapsedInput
} = require('../../../utils/activitySettings');
const {
    ACTIVITY_PANEL_VALIDATION_TEXT,
    RPC_PANEL_TEXT
} = require('../../../utils/activityPanelText');
const { fetchActivityUserSettings, toModalValue } = require('../../../utils/activityUserSettings');
const { refreshLicensedUserPresence } = require('../../../utils/licensedUserManager');
const { createPanelModal } = require('../../../utils/panelModal');

module.exports = {
    customId: 'rpc',
    modalCustomId: 'rpc_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const current = await fetchActivityUserSettings(interaction.user.id);
        const modal = createPanelModal(interaction, {
            customId: 'rpc_modal',
            title: RPC_PANEL_TEXT.modalTitle,
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_text_1')
                        .setLabel(RPC_PANEL_TEXT.titleLabel)
                        .setStyle('SHORT')
                        .setPlaceholder(RPC_PANEL_TEXT.titlePlaceholder)
                        .setRequired(true)
                        .setValue(toModalValue(current.rpc_text_1 || current.rpc_text))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_details_1')
                        .setLabel(RPC_PANEL_TEXT.detailsLabel)
                        .setStyle('SHORT')
                        .setPlaceholder(RPC_PANEL_TEXT.detailsPlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(current.rpc_details_1))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_elapsed_1')
                        .setLabel(RPC_PANEL_TEXT.elapsedLabel)
                        .setStyle('SHORT')
                        .setPlaceholder(RPC_PANEL_TEXT.elapsedPlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(formatElapsedSeconds(current.rpc_elapsed_seconds_1)))
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        try {
            const title = interaction.fields.getTextInputValue('rpc_text_1').trim();
            const details = normalizeOptionalText(interaction.fields.getTextInputValue('rpc_details_1'));
            const rawElapsed = interaction.fields.getTextInputValue('rpc_elapsed_1').trim();
            const elapsedSeconds = parseElapsedInput(rawElapsed);

            if (rawElapsed && elapsedSeconds === null) {
                throw new Error('ELAPSED_TIME_INVALID');
            }

            await pool.execute(
                `INSERT INTO user_settings (
                    user_id,
                    rpc_text,
                    rpc_text_1,
                    rpc_details_1,
                    rpc_elapsed_seconds_1,
                    rpc_text_2,
                    rpc_details_2,
                    rpc_elapsed_seconds_2
                )
                 VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)
                 ON DUPLICATE KEY UPDATE
                 rpc_text = VALUES(rpc_text),
                 rpc_text_1 = VALUES(rpc_text_1),
                 rpc_details_1 = VALUES(rpc_details_1),
                 rpc_elapsed_seconds_1 = VALUES(rpc_elapsed_seconds_1),
                 rpc_text_2 = NULL,
                 rpc_details_2 = NULL,
                 rpc_elapsed_seconds_2 = NULL`,
                [interaction.user.id, title, title, details, elapsedSeconds]
            );

            await refreshLicensedUserPresence(interaction.user.id).catch(() => {});

            const elapsedText = formatElapsedSeconds(elapsedSeconds);
            await interaction.reply({
                content: `${RPC_PANEL_TEXT.saved} "${title}"${elapsedText ? ` (플레이타임 ${elapsedText})` : ''}`,
                ephemeral: true
            });
        } catch (error) {
            const message = error.message === 'ELAPSED_TIME_INVALID'
                ? ACTIVITY_PANEL_VALIDATION_TEXT.invalidElapsed
                : RPC_PANEL_TEXT.saveFailed;

            await interaction.reply({
                content: message,
                ephemeral: true
            });
        }
    }
};
