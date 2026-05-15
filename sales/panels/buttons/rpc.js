const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const {
    formatElapsedSeconds,
    normalizeOptionalText,
    parseElapsedInput
} = require('../../../utils/activitySettings');
const { createPanelModal } = require('../../../utils/panelModal');

module.exports = {
    customId: 'rpc',
    modalCustomId: 'rpc_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const modal = createPanelModal(interaction, {
            customId: 'rpc_modal',
            title: 'RPC 1 설정',
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_text_1')
                        .setLabel('제목')
                        .setStyle('SHORT')
                        .setPlaceholder('예: Visual Studio Code')
                        .setRequired(true)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_details_1')
                        .setLabel('세부 설명')
                        .setStyle('SHORT')
                        .setPlaceholder('선택 입력')
                        .setRequired(false)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_elapsed_1')
                        .setLabel('누적 플레이타임')
                        .setStyle('SHORT')
                        .setPlaceholder('24:53:01 또는 53:01')
                        .setRequired(false)
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        try {
            const title = interaction.fields.getTextInputValue('rpc_text_1').trim();
            const details = normalizeOptionalText(interaction.fields.getTextInputValue('rpc_details_1'));
            const elapsedSeconds = parseElapsedInput(interaction.fields.getTextInputValue('rpc_elapsed_1'));

            const rawElapsed = interaction.fields.getTextInputValue('rpc_elapsed_1').trim();
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
                    rpc_button_label_1,
                    rpc_button_url_1
                )
                 VALUES (?, ?, ?, ?, ?, NULL, NULL)
                 ON DUPLICATE KEY UPDATE
                 rpc_text = VALUES(rpc_text),
                 rpc_text_1 = VALUES(rpc_text_1),
                 rpc_details_1 = VALUES(rpc_details_1),
                 rpc_elapsed_seconds_1 = VALUES(rpc_elapsed_seconds_1),
                 rpc_button_label_1 = NULL,
                 rpc_button_url_1 = NULL`,
                [
                    interaction.user.id,
                    title,
                    title,
                    details,
                    elapsedSeconds
                ]
            );

            const elapsedText = formatElapsedSeconds(elapsedSeconds);
            await interaction.reply({
                content: `RPC 1을 "${title}"로 저장했습니다.${elapsedText ? ` 플레이타임 ${elapsedText}도 반영됩니다.` : ''}`,
                ephemeral: true
            });
        } catch (error) {
            const message = error.message === 'ELAPSED_TIME_INVALID'
                ? '플레이타임은 `24:53:01` 또는 `53:01` 형식으로 입력해 주세요.'
                : 'RPC 1 설정 저장 중 오류가 발생했습니다.';

            await interaction.reply({
                content: message,
                ephemeral: true
            });
        }
    }
};
