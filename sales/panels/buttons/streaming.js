const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const {
    formatElapsedSeconds,
    normalizeOptionalText,
    normalizeStreamingUrl,
    parseElapsedInput
} = require('../../../utils/activitySettings');
const {
    ACTIVITY_PANEL_VALIDATION_TEXT,
    STREAMING_PANEL_TEXT
} = require('../../../utils/activityPanelText');
const { fetchActivityUserSettings, toModalValue } = require('../../../utils/activityUserSettings');
const { refreshLicensedUserPresence } = require('../../../utils/licensedUserManager');
const { createPanelModal } = require('../../../utils/panelModal');

module.exports = {
    customId: 'streaming',
    modalCustomId: 'streaming_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const current = await fetchActivityUserSettings(interaction.user.id);
        const modal = createPanelModal(interaction, {
            customId: 'streaming_modal',
            title: STREAMING_PANEL_TEXT.modalTitle,
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_text')
                        .setLabel(STREAMING_PANEL_TEXT.titleLabel)
                        .setStyle('SHORT')
                        .setPlaceholder(STREAMING_PANEL_TEXT.titlePlaceholder)
                        .setRequired(true)
                        .setValue(toModalValue(current.streaming_text))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_details')
                        .setLabel(STREAMING_PANEL_TEXT.detailsLabel)
                        .setStyle('SHORT')
                        .setPlaceholder(STREAMING_PANEL_TEXT.detailsPlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(current.streaming_details))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_elapsed')
                        .setLabel(STREAMING_PANEL_TEXT.elapsedLabel)
                        .setStyle('SHORT')
                        .setPlaceholder(STREAMING_PANEL_TEXT.elapsedPlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(formatElapsedSeconds(current.streaming_elapsed_seconds)))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_url')
                        .setLabel(STREAMING_PANEL_TEXT.urlLabel)
                        .setStyle('SHORT')
                        .setPlaceholder(STREAMING_PANEL_TEXT.urlPlaceholder)
                        .setRequired(true)
                        .setValue(toModalValue(current.streaming_url))
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        try {
            const title = interaction.fields.getTextInputValue('streaming_text').trim();
            const details = normalizeOptionalText(interaction.fields.getTextInputValue('streaming_details'));
            const rawElapsed = interaction.fields.getTextInputValue('streaming_elapsed').trim();
            const streamingUrl = normalizeStreamingUrl(
                interaction.fields.getTextInputValue('streaming_url')
            );
            const elapsedSeconds = parseElapsedInput(rawElapsed);

            if (rawElapsed && elapsedSeconds === null) {
                throw new Error('ELAPSED_TIME_INVALID');
            }

            await pool.execute(
                `INSERT INTO user_settings (
                    user_id,
                    streaming_text,
                    streaming_details,
                    streaming_url,
                    streaming_elapsed_seconds
                )
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 streaming_text = VALUES(streaming_text),
                 streaming_details = VALUES(streaming_details),
                 streaming_url = VALUES(streaming_url),
                 streaming_elapsed_seconds = VALUES(streaming_elapsed_seconds)`,
                [interaction.user.id, title, details, streamingUrl, elapsedSeconds]
            );

            await refreshLicensedUserPresence(interaction.user.id).catch(() => {});

            const elapsedText = formatElapsedSeconds(elapsedSeconds);
            await interaction.reply({
                content: `${STREAMING_PANEL_TEXT.saved} "${title}"${elapsedText ? ` (경과 시간 ${elapsedText})` : ''}`,
                ephemeral: true
            });
        } catch (error) {
            const message = error.message === 'ELAPSED_TIME_INVALID'
                ? ACTIVITY_PANEL_VALIDATION_TEXT.invalidElapsed
                : error.message === 'STREAMING_URL_REQUIRED' || error.message === 'STREAMING_URL_INVALID'
                    ? ACTIVITY_PANEL_VALIDATION_TEXT.invalidStreamingUrl
                    : STREAMING_PANEL_TEXT.saveFailed;

            await interaction.reply({
                content: message,
                ephemeral: true
            });
        }
    }
};
