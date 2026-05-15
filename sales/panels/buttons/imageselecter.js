const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const { normalizeOptionalText } = require('../../../utils/activitySettings');
const { createPanelModal } = require('../../../utils/panelModal');

module.exports = {
    customId: 'image_selecter',
    modalCustomId: 'image_selecter_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const modal = createPanelModal(interaction, {
            customId: 'image_selecter_modal',
            title: '이미지 설정',
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('large_image_url')
                        .setLabel('큰 이미지 URL')
                        .setStyle('SHORT')
                        .setPlaceholder('https://cdn.discordapp.com/... 또는 asset id')
                        .setRequired(false)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('small_image_url')
                        .setLabel('작은 이미지 URL')
                        .setStyle('SHORT')
                        .setPlaceholder('https://cdn.discordapp.com/... 또는 asset id')
                        .setRequired(false)
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        const largeImageUrl = normalizeOptionalText(interaction.fields.getTextInputValue('large_image_url'));
        const smallImageUrl = normalizeOptionalText(interaction.fields.getTextInputValue('small_image_url'));

        await pool.execute(
            `INSERT INTO user_settings (user_id, large_image_url, small_image_url)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
             large_image_url = VALUES(large_image_url),
             small_image_url = VALUES(small_image_url)`,
            [interaction.user.id, largeImageUrl, smallImageUrl]
        );

        await interaction.reply({
            content: '이미지 설정을 저장했습니다. 비워 두면 해당 이미지는 제거됩니다.',
            ephemeral: true
        });
    }
};
