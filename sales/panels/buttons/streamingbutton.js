const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const { normalizeButtonPair } = require('../../../utils/activitySettings');
const { fetchActivityUserSettings, toModalValue } = require('../../../utils/activityUserSettings');
const { refreshLicensedUserPresence } = require('../../../utils/licensedUserManager');
const { createPanelModal } = require('../../../utils/panelModal');

module.exports = {
    customId: 'streaming_button',
    modalCustomId: 'streaming_button_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const current = await fetchActivityUserSettings(interaction.user.id);
        const modal = createPanelModal(interaction, {
            customId: 'streaming_button_modal',
            title: '스트리밍 버튼 설정',
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_button_label')
                        .setLabel('버튼 1 이름')
                        .setStyle('SHORT')
                        .setPlaceholder('예: Prime Service')
                        .setRequired(false)
                        .setValue(toModalValue(current.streaming_button_label))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_button_url')
                        .setLabel('버튼 1 링크')
                        .setStyle('SHORT')
                        .setPlaceholder('https://example.com')
                        .setRequired(false)
                        .setValue(toModalValue(current.streaming_button_url))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_button_label_2')
                        .setLabel('버튼 2 이름')
                        .setStyle('SHORT')
                        .setPlaceholder('선택 입력')
                        .setRequired(false)
                        .setValue(toModalValue(current.streaming_button_label_2))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('streaming_button_url_2')
                        .setLabel('버튼 2 링크')
                        .setStyle('SHORT')
                        .setPlaceholder('https://example.com')
                        .setRequired(false)
                        .setValue(toModalValue(current.streaming_button_url_2))
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        try {
            const button1 = normalizeButtonPair(
                interaction.fields.getTextInputValue('streaming_button_label'),
                interaction.fields.getTextInputValue('streaming_button_url')
            );
            const button2 = normalizeButtonPair(
                interaction.fields.getTextInputValue('streaming_button_label_2'),
                interaction.fields.getTextInputValue('streaming_button_url_2')
            );

            await pool.execute(
                `INSERT INTO user_settings (
                    user_id,
                    streaming_button_label,
                    streaming_button_url,
                    streaming_button_label_2,
                    streaming_button_url_2
                )
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 streaming_button_label = VALUES(streaming_button_label),
                 streaming_button_url = VALUES(streaming_button_url),
                 streaming_button_label_2 = VALUES(streaming_button_label_2),
                 streaming_button_url_2 = VALUES(streaming_button_url_2)`,
                [
                    interaction.user.id,
                    button1?.name || null,
                    button1?.url || null,
                    button2?.name || null,
                    button2?.url || null
                ]
            );

            await refreshLicensedUserPresence(interaction.user.id).catch(() => {});

            await interaction.reply({
                content: '스트리밍 버튼 설정을 저장했습니다.',
                ephemeral: true
            });
        } catch (error) {
            const message = error.message === 'BUTTON_PAIR_INCOMPLETE'
                ? '버튼 이름과 링크를 각각 같이 입력하거나 둘 다 비워 주세요.'
                : error.message === 'BUTTON_URL_INVALID'
                    ? '버튼 링크는 `https://` 또는 `http://` 형식이어야 합니다.'
                    : '스트리밍 버튼 저장 중 오류가 발생했습니다.';

            await interaction.reply({
                content: message,
                ephemeral: true
            });
        }
    }
};
