const { buildTextCard, formatDateTime } = require('../../../utils/premiumText');
const {
    getUserLicenseSummary,
    isLicenseActive
} = require('../../../utils/licenseUtils');

module.exports = {
    customId: 'check_license',
    async execute(interaction) {
        const summary = await getUserLicenseSummary(interaction.user.id);

        if (!summary) {
            return interaction.reply({ content: '등록된 라이선스가 없습니다.', ephemeral: true });
        }

        const isValid = isLicenseActive(summary);
        const content = buildTextCard({
            accent: 'LICENSE VERIFY',
            title: '라이선스 검증 결과',
            subtitle: '현재 계정에 연결된 라이선스를 즉시 점검했습니다.',
            sections: [
                {
                    label: 'VERDICT',
                    lines: [
                        `상태: \`${isValid ? 'VALID / 사용 가능' : 'EXPIRED / 만료됨'}\``,
                        `만료일: \`${formatDateTime(summary.expiryDate, '기록 없음')}\``,
                        `적용된 키 수: \`${summary.appliedCount}개\``
                    ]
                }
            ],
            footer: isValid ? '정상적으로 이용 가능한 상태입니다.' : '새 라이선스를 등록하거나 기간을 갱신해주세요.'
        });

        await interaction.reply({ content, ephemeral: true });
    }
};
