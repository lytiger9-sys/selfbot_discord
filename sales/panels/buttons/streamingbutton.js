const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const { normalizeButtonPair } = require('../../../utils/activitySettings');
const {
    ACTIVITY_PANEL_VALIDATION_TEXT,
    STREAMING_BUTTON_PANEL_TEXT
} = require('../../../utils/activityPanelText');
const { fetchActivityUserSettings, toModalValue } = require('../../../utils/activityUserSettings');
const { refreshLicensedUserPresence } = require('../../../utils/licensedUserManager');
const { createPanelModal } = require('../../../utils/panelModal');

module.exports = {
    customId: 'streaming_button',
    modalCustomId: 'streaming_button_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const current = await fetchActivityUserSettings(interaction.user.id);
        const modal = createPanelModal(interaction, {
            customId: 'streaming_button_modal',
            title: STREAMING_BUTTON_PANEL_TEXT.modalTitle,
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_button_label')
                        .setLabel(STREAMING_BUTTON_PANEL_TEXT.firstLabelName)
                        .setStyle('SHORT')
                        .setPlaceholder(STREAMING_BUTTON_PANEL_TEXT.firstLabelPlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(current.streaming_button_label))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_button_url')
                        .setLabel(STREAMING_BUTTON_PANEL_TEXT.firstUrlLabel)
                        .setStyle('SHORT')
                        .setPlaceholder(STREAMING_BUTTON_PANEL_TEXT.firstUrlPlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(current.streaming_button_url))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_button_label_2')
                        .setLabel(STREAMING_BUTTON_PANEL_TEXT.secondLabelName)
                        .setStyle('SHORT')
                        .setPlaceholder(STREAMING_BUTTON_PANEL_TEXT.secondLabelPlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(current.streaming_button_label_2))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_button_url_2')
                        .setLabel(STREAMING_BUTTON_PANEL_TEXT.secondUrlLabel)
                        .setStyle('SHORT')
                        .setPlaceholder(STREAMING_BUTTON_PANEL_TEXT.secondUrlPlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(current.streaming_button_url_2))
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        try {
            const button1 = normalizeButtonPair(
                interaction.fields.getTextInputValue('streaming_button_label'),
                interaction.fields.getTextInputValue('streaming_button_url')
            );
            const button2 = normalizeButtonPair(
                interaction.fields.getTextInputValue('streaming_button_label_2'),
                interaction.fields.getTextInputValue('streaming_button_url_2')
            );

            await pool.execute(
                `INSERT INTO user_settings (
                    user_id,
                    streaming_button_label,
                    streaming_button_url,
                    streaming_button_label_2,
                    streaming_button_url_2
                )
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 streaming_button_label = VALUES(streaming_button_label),
                 streaming_button_url = VALUES(streaming_button_url),
                 streaming_button_label_2 = VALUES(streaming_button_label_2),
                 streaming_button_url_2 = VALUES(streaming_button_url_2)`,
                [
                    interaction.user.id,
                    button1?.name || null,
                    button1?.url || null,
                    button2?.name || null,
                    button2?.url || null
                ]
            );

            await refreshLicensedUserPresence(interaction.user.id).catch(() => {});

            await interaction.reply({
                content: STREAMING_BUTTON_PANEL_TEXT.saved,
                ephemeral: true
            });
        } catch (error) {
            const message = error.message === 'BUTTON_PAIR_INCOMPLETE'
                ? ACTIVITY_PANEL_VALIDATION_TEXT.incompleteButtonPair
                : error.message === 'BUTTON_URL_INVALID'
                    ? ACTIVITY_PANEL_VALIDATION_TEXT.invalidButtonUrl
                    : STREAMING_BUTTON_PANEL_TEXT.saveFailed;

            await interaction.reply({
                content: message,
                ephemeral: true
            });
        }
    }
};
