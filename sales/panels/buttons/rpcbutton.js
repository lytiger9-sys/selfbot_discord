const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const { normalizeButtonPair } = require('../../../utils/activitySettings');
const {
    ACTIVITY_PANEL_VALIDATION_TEXT,
    RPC_BUTTON_PANEL_TEXT
} = require('../../../utils/activityPanelText');
const { fetchActivityUserSettings, toModalValue } = require('../../../utils/activityUserSettings');
const { refreshLicensedUserPresence } = require('../../../utils/licensedUserManager');
const { createPanelModal } = require('../../../utils/panelModal');

module.exports = {
    customId: 'rpc_button',
    modalCustomId: 'rpc_button_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const current = await fetchActivityUserSettings(interaction.user.id);
        const modal = createPanelModal(interaction, {
            customId: 'rpc_button_modal',
            title: RPC_BUTTON_PANEL_TEXT.modalTitle,
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_button_label_1')
                        .setLabel(RPC_BUTTON_PANEL_TEXT.firstLabelName)
                        .setStyle('SHORT')
                        .setPlaceholder(RPC_BUTTON_PANEL_TEXT.firstLabelPlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(current.rpc_button_label_1))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_button_url_1')
                        .setLabel(RPC_BUTTON_PANEL_TEXT.firstUrlLabel)
                        .setStyle('SHORT')
                        .setPlaceholder(RPC_BUTTON_PANEL_TEXT.firstUrlPlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(current.rpc_button_url_1))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_button_label_2')
                        .setLabel(RPC_BUTTON_PANEL_TEXT.secondLabelName)
                        .setStyle('SHORT')
                        .setPlaceholder(RPC_BUTTON_PANEL_TEXT.secondLabelPlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(current.rpc_button_label_2))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_button_url_2')
                        .setLabel(RPC_BUTTON_PANEL_TEXT.secondUrlLabel)
                        .setStyle('SHORT')
                        .setPlaceholder(RPC_BUTTON_PANEL_TEXT.secondUrlPlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(current.rpc_button_url_2))
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        try {
            const button1 = normalizeButtonPair(
                interaction.fields.getTextInputValue('rpc_button_label_1'),
                interaction.fields.getTextInputValue('rpc_button_url_1')
            );
            const button2 = normalizeButtonPair(
                interaction.fields.getTextInputValue('rpc_button_label_2'),
                interaction.fields.getTextInputValue('rpc_button_url_2')
            );

            await pool.execute(
                `INSERT INTO user_settings (
                    user_id,
                    rpc_button_label_1,
                    rpc_button_url_1,
                    rpc_button_label_2,
                    rpc_button_url_2
                )
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 rpc_button_label_1 = VALUES(rpc_button_label_1),
                 rpc_button_url_1 = VALUES(rpc_button_url_1),
                 rpc_button_label_2 = VALUES(rpc_button_label_2),
                 rpc_button_url_2 = VALUES(rpc_button_url_2)`,
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
                content: RPC_BUTTON_PANEL_TEXT.saved,
                ephemeral: true
            });
        } catch (error) {
            const message = error.message === 'BUTTON_PAIR_INCOMPLETE'
                ? ACTIVITY_PANEL_VALIDATION_TEXT.incompleteButtonPair
                : error.message === 'BUTTON_URL_INVALID'
                    ? ACTIVITY_PANEL_VALIDATION_TEXT.invalidButtonUrl
                    : RPC_BUTTON_PANEL_TEXT.saveFailed;

            await interaction.reply({
                content: message,
                ephemeral: true
            });
        }
    }
};
