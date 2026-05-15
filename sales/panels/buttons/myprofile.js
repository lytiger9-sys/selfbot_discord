const { buildTextCard, formatDateTime } = require('../../../utils/premiumText');
const {
    getLicensePlanLabel,
    getUserLicenseSummary,
    isLicenseActive
} = require('../../../utils/licenseUtils');

module.exports = {
    customId: 'my_profile',
    async execute(interaction) {
        const summary = await getUserLicenseSummary(interaction.user.id);

        if (!summary) {
            return interaction.reply({ content: '라이선스 정보가 없습니다.', ephemeral: true });
        }

        const isActive = isLicenseActive(summary);
        const content = buildTextCard({
            accent: 'PROFILE DOSSIER',
            title: '내 라이선스 정보',
            subtitle: '현재 계정에 연결된 라이선스 상태를 정리했습니다.',
            sections: [
                {
                    label: 'LICENSE',
                    lines: [
                        `상태: \`${isActive ? '활성화됨' : '만료됨'}\``,
                        `적용된 키 수: \`${summary.appliedCount}개\``,
                        `사용 기간: \`${getLicensePlanLabel(summary)}\``
                    ]
                },
                {
                    label: 'TIMELINE',
                    lines: [
                        `시작일: \`${formatDateTime(summary.startDate, 'N/A')}\``,
                        `만료일: \`${formatDateTime(summary.expiryDate, 'N/A')}\``
                    ]
                }
            ],
            footer: '버튼 패널에서 추가 설정을 이어서 진행할 수 있습니다.'
        });

        await interaction.reply({ content, ephemeral: true });
    }
};
