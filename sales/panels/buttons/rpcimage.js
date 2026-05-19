const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const { normalizeOptionalText } = require('../../../utils/activitySettings');
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
            title: 'RPC 사진 설정',
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_large_image_url')
                        .setLabel('큰 이미지 URL')
                        .setStyle('SHORT')
                        .setPlaceholder('https://cdn.discordapp.com/... 또는 asset id')
                        .setRequired(false)
                        .setValue(toModalValue(current.rpc_large_image_url))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_small_image_url')
                        .setLabel('작은 이미지 URL')
                        .setStyle('SHORT')
                        .setPlaceholder('https://cdn.discordapp.com/... 또는 asset id')
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
            content: 'RPC 사진 설정을 저장했습니다. 비워 두면 해당 이미지는 제거됩니다.',
            ephemeral: true
        });
    }
};
