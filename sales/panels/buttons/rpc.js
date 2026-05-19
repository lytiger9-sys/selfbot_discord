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
    customId: 'rpc',
    modalCustomId: 'rpc_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const current = await fetchActivityUserSettings(interaction.user.id);
        const modal = createPanelModal(interaction, {
            customId: 'rpc_modal',
            title: 'RPC 설정',
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_text_1')
                        .setLabel('제목')
                        .setStyle('SHORT')
                        .setPlaceholder('예: Visual Studio Code')
                        .setRequired(true)
                        .setValue(toModalValue(current.rpc_text_1 || current.rpc_text))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_details_1')
                        .setLabel('세부설명')
                        .setStyle('SHORT')
                        .setPlaceholder('선택 입력')
                        .setRequired(false)
                        .setValue(toModalValue(current.rpc_details_1))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_elapsed_1')
                        .setLabel('경과 시간')
                        .setStyle('SHORT')
                        .setPlaceholder('24:53:01 또는 53:01')
                        .setRequired(false)
                        .setValue(toModalValue(formatElapsedSeconds(current.rpc_elapsed_seconds_1)))
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        try {
            const title = interaction.fields.getTextInputValue('rpc_text_1').trim();
            const details = normalizeOptionalText(interaction.fields.getTextInputValue('rpc_details_1'));
            const rawElapsed = interaction.fields.getTextInputValue('rpc_elapsed_1').trim();
            const elapsedSeconds = parseElapsedInput(rawElapsed);

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
                    rpc_text_2,
                    rpc_details_2,
                    rpc_elapsed_seconds_2
                )
                 VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)
                 ON DUPLICATE KEY UPDATE
                 rpc_text = VALUES(rpc_text),
                 rpc_text_1 = VALUES(rpc_text_1),
                 rpc_details_1 = VALUES(rpc_details_1),
                 rpc_elapsed_seconds_1 = VALUES(rpc_elapsed_seconds_1),
                 rpc_text_2 = NULL,
                 rpc_details_2 = NULL,
                 rpc_elapsed_seconds_2 = NULL`,
                [interaction.user.id, title, title, details, elapsedSeconds]
            );

            await refreshLicensedUserPresence(interaction.user.id).catch(() => {});

            const elapsedText = formatElapsedSeconds(elapsedSeconds);
            await interaction.reply({
                content: `RPC를 "${title}"로 저장했습니다.${elapsedText ? ` 경과 시간 ${elapsedText}도 반영했습니다.` : ''}`,
                ephemeral: true
            });
        } catch (error) {
            const message = error.message === 'ELAPSED_TIME_INVALID'
                ? '경과 시간은 `24:53:01` 또는 `53:01` 형식으로 입력해 주세요.'
                : 'RPC 설정 저장 중 오류가 발생했습니다.';

            await interaction.reply({
                content: message,
                ephemeral: true
            });
        }
    }
};
