const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const { normalizeButtonPair } = require('../../../utils/activitySettings');
const { fetchActivityUserSettings, toModalValue } = require('../../../utils/activityUserSettings');
const { refreshLicensedUserPresence } = require('../../../utils/licensedUserManager');
const { createPanelModal } = require('../../../utils/panelModal');

module.exports = {
    customId: 'rpc_button',
    modalCustomId: 'rpc_button_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const current = await fetchActivityUserSettings(interaction.user.id);
        const modal = createPanelModal(interaction, {
            customId: 'rpc_button_modal',
            title: 'RPC 버튼 설정',
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_button_label_1')
                        .setLabel('버튼 1 이름')
                        .setStyle('SHORT')
                        .setPlaceholder('예: Prime Service')
                        .setRequired(false)
                        .setValue(toModalValue(current.rpc_button_label_1))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_button_url_1')
                        .setLabel('버튼 1 링크')
                        .setStyle('SHORT')
                        .setPlaceholder('https://example.com')
                        .setRequired(false)
                        .setValue(toModalValue(current.rpc_button_url_1))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_button_label_2')
                        .setLabel('버튼 2 이름')
                        .setStyle('SHORT')
                        .setPlaceholder('선택 입력')
                        .setRequired(false)
                        .setValue(toModalValue(current.rpc_button_label_2))
                ),
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('rpc_button_url_2')
                        .setLabel('버튼 2 링크')
                        .setStyle('SHORT')
                        .setPlaceholder('https://example.com')
                        .setRequired(false)
                        .setValue(toModalValue(current.rpc_button_url_2))
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        try {
            const button1 = normalizeButtonPair(
                interaction.fields.getTextInputValue('rpc_button_label_1'),
                interaction.fields.getTextInputValue('rpc_button_url_1')
            );
            const button2 = normalizeButtonPair(
                interaction.fields.getTextInputValue('rpc_button_label_2'),
                interaction.fields.getTextInputValue('rpc_button_url_2')
            );

            await pool.execute(
                `INSERT INTO user_settings (
                    user_id,
                    rpc_button_label_1,
                    rpc_button_url_1,
                    rpc_button_label_2,
                    rpc_button_url_2
                )
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 rpc_button_label_1 = VALUES(rpc_button_label_1),
                 rpc_button_url_1 = VALUES(rpc_button_url_1),
                 rpc_button_label_2 = VALUES(rpc_button_label_2),
                 rpc_button_url_2 = VALUES(rpc_button_url_2)`,
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
                content: 'RPC 버튼 설정을 저장했습니다.',
                ephemeral: true
            });
        } catch (error) {
            const message = error.message === 'BUTTON_PAIR_INCOMPLETE'
                ? '버튼 이름과 링크를 각각 같이 입력하거나 둘 다 비워 주세요.'
                : error.message === 'BUTTON_URL_INVALID'
                    ? '버튼 링크는 `https://` 또는 `http://` 형식이어야 합니다.'
                    : 'RPC 버튼 저장 중 오류가 발생했습니다.';

            await interaction.reply({
                content: message,
                ephemeral: true
            });
        }
    }
};
