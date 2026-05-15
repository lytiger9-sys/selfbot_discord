const pool = require('../../db');
const { sendTemporaryMessage } = require('../../utils/commandUtils');
const { applyRoleTemplateToGuild } = require('../../utils/roleTemplateUtils');

module.exports = {
    name: '!역할 적용',
    description: '저장한 역할 템플릿을 현재 서버의 가장 아래 역할들로 추가합니다.',
    async execute(message) {
        if (!message.guild) {
            return sendTemporaryMessage(message.channel, '이 명령어는 서버 안에서만 사용할 수 있습니다.', 3000);
        }

        const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
        if (!member?.permissions?.has('ADMINISTRATOR')) {
            return sendTemporaryMessage(message.channel, '현재 서버 관리자만 사용할 수 있습니다.', 3000);
        }

        const [rows] = await pool.execute(
            'SELECT role_data FROM role_templates WHERE owner_id = ?',
            [message.author.id]
        );

        if (!rows.length) {
            return sendTemporaryMessage(message.channel, '먼저 `!역할 복사`로 역할 템플릿을 저장해 주세요.', 3000);
        }

        let template;
        try {
            template = JSON.parse(rows[0].role_data);
        } catch (error) {
            return sendTemporaryMessage(message.channel, '저장된 역할 템플릿을 읽는 중 오류가 발생했습니다.', 3000);
        }

        await sendTemporaryMessage(message.channel, '역할 템플릿 적용을 시작합니다.', 3000);
        await applyRoleTemplateToGuild(message.guild, template);
        await sendTemporaryMessage(message.channel, `역할 ${template.roles?.length || 0}개를 가장 아래에 추가했습니다.`, 3000);
    }
};
