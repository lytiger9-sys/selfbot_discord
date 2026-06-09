const { sendMessage } = require('../../utils/commandUtils');
const { getBaseUrl } = require('../../web/admin/config');
const { buildLicensePageUrl } = require('../../web/admin/licenseService');

function buildLicenseWebsiteUrl() {
    const baseUrl = String(getBaseUrl() || '').trim().replace(/\/+$/, '');
    return new URL(buildLicensePageUrl(), `${baseUrl}/`).toString();
}

module.exports = {
    name: '!라이센스',
    aliases: ['!license'],
    adminOnly: true,
    description: '!라이센스 : 웹사이트로 이동하기',
    async execute(message) {
        const websiteUrl = buildLicenseWebsiteUrl();

        await sendMessage(message.channel, {
            content: `**라이센스 웹사이트**\n[웹사이트로 이동하기](${websiteUrl})`
        });
    }
};
