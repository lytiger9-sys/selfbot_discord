const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const {
    formatElapsedSeconds,
    normalizeOptionalText,
    parseElapsedInput
} = require('../../../utils/activitySettings');
const { createPanelModal } = require('../../../utils/panelModal');

module.exports = {
    customId: 'rpc_2',
    modalCustomId: 'rpc_2_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const modal = createPanelModal(interaction, {
            customId: 'rpc_2_modal',
            title: 'RPC 2 설정',
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_text_2')
                        .setLabel('제목')
                        .setStyle('SHORT')
                        .setPlaceholder('예: VALORANT')
                        .setRequired(true)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_details_2')
                        .setLabel('세부 설명')
                        .setStyle('SHORT')
                        .setPlaceholder('선택 입력')
                        .setRequired(false)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_elapsed_2')
                        .setLabel('누적 플레이타임')
                        .setStyle('SHORT')
                        .setPlaceholder('24:53:01 또는 53:01')
                        .setRequired(false)
                ),
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
        try {
            const title = interaction.fields.getTextInputValue('rpc_text_2').trim();
            const details = normalizeOptionalText(interaction.fields.getTextInputValue('rpc_details_2'));
            const elapsedSeconds = parseElapsedInput(interaction.fields.getTextInputValue('rpc_elapsed_2'));
            const largeImageUrl = normalizeOptionalText(interaction.fields.getTextInputValue('large_image_url'));
            const smallImageUrl = normalizeOptionalText(interaction.fields.getTextInputValue('small_image_url'));

            const rawElapsed = interaction.fields.getTextInputValue('rpc_elapsed_2').trim();
            if (rawElapsed && elapsedSeconds === null) {
                throw new Error('ELAPSED_TIME_INVALID');
            }

            await pool.execute(
                `INSERT INTO user_settings (
                    user_id,
                    rpc_text_2,
                    rpc_details_2,
                    rpc_elapsed_seconds_2,
                    rpc_button_label_2,
                    rpc_button_url_2,
                    large_image_url,
                    small_image_url
                )
                 VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 rpc_text_2 = VALUES(rpc_text_2),
                 rpc_details_2 = VALUES(rpc_details_2),
                 rpc_elapsed_seconds_2 = VALUES(rpc_elapsed_seconds_2),
                 rpc_button_label_2 = NULL,
                 rpc_button_url_2 = NULL,
                 large_image_url = VALUES(large_image_url),
                 small_image_url = VALUES(small_image_url)`,
                [
                    interaction.user.id,
                    title,
                    details,
                    elapsedSeconds,
                    largeImageUrl,
                    smallImageUrl
                ]
            );

            const elapsedText = formatElapsedSeconds(elapsedSeconds);
            await interaction.reply({
                content: `RPC 2를 "${title}"로 저장했습니다.${elapsedText ? ` 플레이타임 ${elapsedText}도 반영됩니다.` : ''}`,
                ephemeral: true
            });
        } catch (error) {
            const message = error.message === 'ELAPSED_TIME_INVALID'
                ? '플레이타임은 `24:53:01` 또는 `53:01` 형식으로 입력해 주세요.'
                : 'RPC 2 설정 저장 중 오류가 발생했습니다.';

            await interaction.reply({
                content: message,
                ephemeral: true
            });
        }
    }
};
