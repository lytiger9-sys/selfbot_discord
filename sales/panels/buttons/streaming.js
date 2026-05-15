const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const {
    formatElapsedSeconds,
    normalizeOptionalText,
    parseElapsedInput
} = require('../../../utils/activitySettings');
const { createPanelModal } = require('../../../utils/panelModal');

module.exports = {
    customId: 'streaming',
    modalCustomId: 'streaming_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const modal = createPanelModal(interaction, {
            customId: 'streaming_modal',
            title: '스트리밍 설정',
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_text')
                        .setLabel('제목')
                        .setStyle('SHORT')
                        .setPlaceholder('예: Background Coding')
                        .setRequired(true)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_details')
                        .setLabel('세부 설명')
                        .setStyle('SHORT')
                        .setPlaceholder('선택 입력')
                        .setRequired(false)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_elapsed')
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
            const title = interaction.fields.getTextInputValue('streaming_text').trim();
            const details = normalizeOptionalText(interaction.fields.getTextInputValue('streaming_details'));
            const elapsedSeconds = parseElapsedInput(interaction.fields.getTextInputValue('streaming_elapsed'));

            const rawElapsed = interaction.fields.getTextInputValue('streaming_elapsed').trim();
            if (rawElapsed && elapsedSeconds === null) {
                throw new Error('ELAPSED_TIME_INVALID');
            }

            await pool.execute(
                `INSERT INTO user_settings (
                    user_id,
                    streaming_text,
                    streaming_details,
                    streaming_elapsed_seconds,
                    streaming_button_label,
                    streaming_button_url
                )
                 VALUES (?, ?, ?, ?, NULL, NULL)
                 ON DUPLICATE KEY UPDATE
                 streaming_text = VALUES(streaming_text),
                 streaming_details = VALUES(streaming_details),
                 streaming_elapsed_seconds = VALUES(streaming_elapsed_seconds),
                 streaming_button_label = NULL,
                 streaming_button_url = NULL`,
                [
                    interaction.user.id,
                    title,
                    details,
                    elapsedSeconds
                ]
            );

            const elapsedText = formatElapsedSeconds(elapsedSeconds);
            await interaction.reply({
                content: `스트리밍을 "${title}"로 저장했습니다.${elapsedText ? ` 플레이타임 ${elapsedText}도 반영됩니다.` : ''}`,
                ephemeral: true
            });
        } catch (error) {
            const message = error.message === 'ELAPSED_TIME_INVALID'
                ? '플레이타임은 `24:53:01` 또는 `53:01` 형식으로 입력해 주세요.'
                : '스트리밍 설정 저장 중 오류가 발생했습니다.';

            await interaction.reply({
                content: message,
                ephemeral: true
            });
        }
    }
};
