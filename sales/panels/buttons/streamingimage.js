const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const { normalizeOptionalText } = require('../../../utils/activitySettings');
const { fetchActivityUserSettings, toModalValue } = require('../../../utils/activityUserSettings');
const { refreshLicensedUserPresence } = require('../../../utils/licensedUserManager');
const { createPanelModal } = require('../../../utils/panelModal');

module.exports = {
    customId: 'streaming_image',
    modalCustomId: 'streaming_image_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const current = await fetchActivityUserSettings(interaction.user.id);
        const modal = createPanelModal(interaction, {
            customId: 'streaming_image_modal',
            title: '스트리밍 사진 설정',
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_large_image_url')
                        .setLabel('큰 이미지 URL')
                        .setStyle('SHORT')
                        .setPlaceholder('https://cdn.discordapp.com/... 또는 asset id')
                        .setRequired(false)
                        .setValue(toModalValue(current.streaming_large_image_url))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_small_image_url')
                        .setLabel('작은 이미지 URL')
                        .setStyle('SHORT')
                        .setPlaceholder('https://cdn.discordapp.com/... 또는 asset id')
                        .setRequired(false)
                        .setValue(toModalValue(current.streaming_small_image_url))
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        const largeImageUrl = normalizeOptionalText(interaction.fields.getTextInputValue('streaming_large_image_url'));
        const smallImageUrl = normalizeOptionalText(interaction.fields.getTextInputValue('streaming_small_image_url'));

        await pool.execute(
            `INSERT INTO user_settings (
                user_id,
                streaming_large_image_url,
                streaming_small_image_url
            )
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
             streaming_large_image_url = VALUES(streaming_large_image_url),
             streaming_small_image_url = VALUES(streaming_small_image_url)`,
            [interaction.user.id, largeImageUrl, smallImageUrl]
        );
        await refreshLicensedUserPresence(interaction.user.id).catch(() => {});

        await interaction.reply({
            content: '스트리밍 사진 설정을 저장했습니다. 비워 두면 해당 이미지는 제거됩니다.',
            ephemeral: true
        });
    }
};
