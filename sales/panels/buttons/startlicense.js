const { MessageActionRow, TextInputComponent } = require('discord.js');
const { formatDateTime } = require('../../../utils/premiumText');
const { createPanelModal } = require('../../../utils/panelModal');
const { redeemLicenseKey } = require('../../../utils/licenseUtils');
const { refreshLicensedUserClient } = require('../../../utils/licensedUserManager');

module.exports = {
    customId: 'start_license',
    modalCustomId: 'start_license_modal',
    async execute(interaction) {
        const modal = createPanelModal(interaction, {
            customId: 'start_license_modal',
            title: '라이센스 시작',
            components: [
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('license_key')
                        .setLabel('발급받은 라이센스 키')
                        .setStyle('SHORT')
                        .setPlaceholder('예: ABCD1234')
                        .setRequired(true)
                )
            ]
        });

        await interaction.showModal(modal);
    },
    async handleModalSubmit(interaction) {
        const key = interaction.fields.getTextInputValue('license_key').trim();
        const result = await redeemLicenseKey(interaction.user.id, key, new Date());

        if (!result.ok) {
            const reasonMap = {
                NOT_FOUND: '존재하지 않는 라이센스입니다.',
                ALREADY_REDEEMED: '이미 다른 사용자가 사용 중인 라이센스입니다.',
                ALREADY_REDEEMED_BY_USER: '이미 사용한 라이센스 키입니다. 새 키를 입력해주세요.'
            };

            return interaction.reply({
                content: reasonMap[result.reason] || '라이센스를 처리하는 중 오류가 발생했습니다.',
                ephemeral: true
            });
        }

        await refreshLicensedUserClient(interaction.user.id).catch(() => {});

        await interaction.reply({
            content: `라이센스를 활성화했습니다. 만료일: \`${formatDateTime(result.expiryDate, '기록 없음')}\``,
            ephemeral: true
        });
    }
};
