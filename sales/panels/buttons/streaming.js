const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const {
    formatElapsedSeconds,
    normalizeOptionalText,
    parseElapsedInput
} = require('../../../utils/activitySettings');
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
            title: '스트리밍 설정',
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_text')
                        .setLabel('제목')
                        .setStyle('SHORT')
                        .setPlaceholder('예: 디자인 문의 Dm | 24H')
                        .setRequired(true)
                        .setValue(toModalValue(current.streaming_text))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_details')
                        .setLabel('세부설명')
                        .setStyle('SHORT')
                        .setPlaceholder('예: 디자인 문의 Dm')
                        .setRequired(false)
                        .setValue(toModalValue(current.streaming_details))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_elapsed')
                        .setLabel('경과 시간')
                        .setStyle('SHORT')
                        .setPlaceholder('24:53:01 또는 53:01')
                        .setRequired(false)
                        .setValue(toModalValue(formatElapsedSeconds(current.streaming_elapsed_seconds)))
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
            const elapsedSeconds = parseElapsedInput(rawElapsed);

            if (rawElapsed && elapsedSeconds === null) {
                throw new Error('ELAPSED_TIME_INVALID');
            }

            await pool.execute(
                `INSERT INTO user_settings (
                    user_id,
                    streaming_text,
                    streaming_details,
                    streaming_elapsed_seconds
                )
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 streaming_text = VALUES(streaming_text),
                 streaming_details = VALUES(streaming_details),
                 streaming_elapsed_seconds = VALUES(streaming_elapsed_seconds)`,
                [interaction.user.id, title, details, elapsedSeconds]
            );

            await refreshLicensedUserPresence(interaction.user.id).catch(() => {});

            const elapsedText = formatElapsedSeconds(elapsedSeconds);
            await interaction.reply({
                content: `스트리밍을 "${title}"로 저장했습니다.${elapsedText ? ` 경과 시간 ${elapsedText}도 반영했습니다.` : ''}`,
                ephemeral: true
            });
        } catch (error) {
            const message = error.message === 'ELAPSED_TIME_INVALID'
                ? '경과 시간은 `24:53:01` 또는 `53:01` 형식으로 입력해 주세요.'
                : '스트리밍 설정 저장 중 오류가 발생했습니다.';

            await interaction.reply({
                content: message,
                ephemeral: true
            });
        }
    }
};
