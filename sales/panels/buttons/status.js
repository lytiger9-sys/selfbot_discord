const { buildTextCard, formatDateTime } = require('../../../utils/premiumText');
const {
    getUserLicenseSummary,
    isLicenseActive
} = require('../../../utils/licenseUtils');

module.exports = {
    customId: 'status',
    async execute(interaction) {
        const summary = await getUserLicenseSummary(interaction.user.id);

        if (!summary) {
            return interaction.reply({ content: '라이선스 정보가 없습니다.', ephemeral: true });
        }

        const expiryDate = summary.expiryDate;
        const isActive = isLicenseActive(summary);
        const remain = expiryDate ? expiryDate - new Date() : 0;
        const days = Math.ceil(remain / (1000 * 60 * 60 * 24));
        const remainingText = isActive ? `${days}일` : '만료됨';

        const content = buildTextCard({
            accent: 'STATUS BOARD',
            title: '현재 라이선스 상태',
            subtitle: '시작일과 남은 사용 기간을 텍스트 카드로 정리했습니다.',
            sections: [
                {
                    label: 'TIMELINE',
                    lines: [
                        `시작일: \`${formatDateTime(summary.startDate, '기록 없음')}\``,
                        `만료일: \`${formatDateTime(expiryDate, '기록 없음')}\``,
                        `남은 기간: \`${remainingText}\``
                    ]
                }
            ],
            footer: isActive ? '정상 사용 기간 안에 있습니다.' : '만료 상태이므로 갱신이 필요합니다.'
        });

        await interaction.reply({ content, ephemeral: true });
    }
};
