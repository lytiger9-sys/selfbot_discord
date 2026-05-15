const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const { normalizeButtonPair } = require('../../../utils/activitySettings');
const { createPanelModal } = require('../../../utils/panelModal');

module.exports = {
    customId: 'activity_buttons',
    modalCustomId: 'activity_buttons_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const modal = createPanelModal(interaction, {
            customId: 'activity_buttons_modal',
            title: '공용 버튼 설정',
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('button_1_label')
                        .setLabel('버튼 1 이름')
                        .setStyle('SHORT')
                        .setPlaceholder('예: 프로젝트 보기')
                        .setRequired(false)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('button_1_url')
                        .setLabel('버튼 1 링크')
                        .setStyle('SHORT')
                        .setPlaceholder('https://example.com')
                        .setRequired(false)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('button_2_label')
                        .setLabel('버튼 2 이름')
                        .setStyle('SHORT')
                        .setPlaceholder('선택 입력')
                        .setRequired(false)
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('button_2_url')
                        .setLabel('버튼 2 링크')
                        .setStyle('SHORT')
                        .setPlaceholder('https://example.com')
                        .setRequired(false)
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        try {
            const button1 = normalizeButtonPair(
                interaction.fields.getTextInputValue('button_1_label'),
                interaction.fields.getTextInputValue('button_1_url')
            );
            const button2 = normalizeButtonPair(
                interaction.fields.getTextInputValue('button_2_label'),
                interaction.fields.getTextInputValue('button_2_url')
            );

            await pool.execute(
                `INSERT INTO user_settings (
                    user_id,
                    activity_button_1_label,
                    activity_button_1_url,
                    activity_button_2_label,
                    activity_button_2_url
                )
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 activity_button_1_label = VALUES(activity_button_1_label),
                 activity_button_1_url = VALUES(activity_button_1_url),
                 activity_button_2_label = VALUES(activity_button_2_label),
                 activity_button_2_url = VALUES(activity_button_2_url)`,
                [
                    interaction.user.id,
                    button1?.name || null,
                    button1?.url || null,
                    button2?.name || null,
                    button2?.url || null
                ]
            );

            await interaction.reply({
                content: '공용 버튼 설정을 저장했습니다. 가장 앞에 표시되는 활동에 최대 2개까지 붙습니다.',
                ephemeral: true
            });
        } catch (error) {
            const message = error.message === 'BUTTON_PAIR_INCOMPLETE'
                ? '버튼 이름과 링크는 함께 입력해야 합니다.'
                : error.message === 'BUTTON_URL_INVALID'
                    ? '버튼 링크는 `https://` 또는 `http://` 형식이어야 합니다.'
                    : '공용 버튼 저장 중 오류가 발생했습니다.';

            await interaction.reply({
                content: message,
                ephemeral: true
            });
        }
    }
};
