const pool = require('../../db');
const { applyTemplateToGuild } = require('../../utils/templateUtils');
const { sendTemporaryMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!템플릿 적용',
    description: '마지막으로 저장한 템플릿을 현재 서버에 적용합니다.\n관리자 권한이 있어야 하며, 역할/카테고리/텍스트 채널 구성이 템플릿 기준으로 바뀝니다.',
    async execute(message) {
        if (!message.guild) {
            return sendTemporaryMessage(message.channel, '❌ 서버 안에서만 사용할 수 있는 명령어입니다.', 3000);
        }

        const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
        if (!member?.permissions?.has('ADMINISTRATOR')) {
            return sendTemporaryMessage(message.channel, '❌ 현재 서버의 관리자가 아닙니다.', 3000);
        }

        const [rows] = await pool.execute(
            'SELECT template_data FROM guild_templates WHERE owner_id = ?',
            [message.author.id]
        );

        if (rows.length === 0) {
            return sendTemporaryMessage(message.channel, '❌ 먼저 `!템플릿 복사`로 템플릿을 저장해 주세요.', 3000);
        }

        let template;
        try {
            template = JSON.parse(rows[0].template_data);
        } catch (error) {
            return sendTemporaryMessage(message.channel, '❌ 저장된 템플릿 데이터를 읽는 중 오류가 발생했습니다.', 3000);
        }

        await sendTemporaryMessage(message.channel, '⏳ 저장된 템플릿 적용을 시작합니다.', 3000);
        await applyTemplateToGuild(message.guild, template);
        await sendTemporaryMessage(message.channel, `✅ ${message.guild.name} 서버에 템플릿 적용을 완료했습니다.`, 3000);
    }
};
