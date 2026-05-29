const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const { normalizeOptionalText } = require('../../../utils/activitySettings');
const { RPC_IMAGE_PANEL_TEXT } = require('../../../utils/activityPanelText');
const { fetchActivityUserSettings, toModalValue } = require('../../../utils/activityUserSettings');
const { refreshLicensedUserPresence } = require('../../../utils/licensedUserManager');
const { createPanelModal } = require('../../../utils/panelModal');

module.exports = {
    customId: 'rpc_image',
    modalCustomId: 'rpc_image_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const current = await fetchActivityUserSettings(interaction.user.id);
        const modal = createPanelModal(interaction, {
            customId: 'rpc_image_modal',
            title: RPC_IMAGE_PANEL_TEXT.modalTitle,
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_large_image_url')
                        .setLabel(RPC_IMAGE_PANEL_TEXT.largeImageLabel)
                        .setStyle('SHORT')
                        .setPlaceholder(RPC_IMAGE_PANEL_TEXT.imagePlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(current.rpc_large_image_url))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_small_image_url')
                        .setLabel(RPC_IMAGE_PANEL_TEXT.smallImageLabel)
                        .setStyle('SHORT')
                        .setPlaceholder(RPC_IMAGE_PANEL_TEXT.imagePlaceholder)
                        .setRequired(false)
                        .setValue(toModalValue(current.rpc_small_image_url))
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        const largeImageUrl = normalizeOptionalText(interaction.fields.getTextInputValue('rpc_large_image_url'));
        const smallImageUrl = normalizeOptionalText(interaction.fields.getTextInputValue('rpc_small_image_url'));

        await pool.execute(
            `INSERT INTO user_settings (
                user_id,
                rpc_large_image_url,
                rpc_small_image_url
            )
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
             rpc_large_image_url = VALUES(rpc_large_image_url),
             rpc_small_image_url = VALUES(rpc_small_image_url)`,
            [interaction.user.id, largeImageUrl, smallImageUrl]
        );
        await refreshLicensedUserPresence(interaction.user.id).catch(() => {});

        await interaction.reply({
            content: RPC_IMAGE_PANEL_TEXT.saved,
            ephemeral: true
        });
    }
};
