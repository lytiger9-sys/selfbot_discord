const { MessageActionRow, TextInputComponent } = require('discord.js');
const pool = require('../../../db');
const { encrypt } = require('../../../cryptoUtils');
const { createPanelModal } = require('../../../utils/panelModal');
const { refreshLicensedUserClient } = require('../../../utils/licensedUserManager');

module.exports = {
    customId: 'input_token',
    modalCustomId: 'input_token_modal',
    requiresActiveLicense: true,
    async execute(interaction) {
        const modal = createPanelModal(interaction, {
            customId: 'input_token_modal',
            title: '토큰 입력',
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('discord_token')
                        .setLabel('디스코드 토큰')
                        .setStyle('PARAGRAPH')
                        .setPlaceholder('입력값은 암호화되어 저장됩니다.')
                        .setRequired(true)
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        const rawToken = interaction.fields.getTextInputValue('discord_token').trim();
        const encryptedToken = encrypt(rawToken);

        await pool.execute(
            'INSERT INTO user_settings (user_id, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE token = VALUES(token)',
            [interaction.user.id, encryptedToken]
        );
        await refreshLicensedUserClient(interaction.user.id).catch(() => {});

        await interaction.reply({
            content: '토큰을 암호화해 저장했습니다. 활성 라이센스가 있으면 유저 클라이언트가 자동으로 연결됩니다.',
            ephemeral: true
        });
    }
};
