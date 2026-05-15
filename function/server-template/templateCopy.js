const pool = require('../../db');
const { extractTemplateFromGuild } = require('../../utils/templateUtils');
const { sendTemporaryMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!템플릿 복사',
    description: '현재 서버의 역할, 카테고리, 텍스트 채널 구조를 내 템플릿으로 저장합니다.',
    async execute(message) {
        if (!message.guild) {
            return sendTemporaryMessage(message.channel, '❌ 서버 안에서만 사용할 수 있는 명령어입니다.', 3000);
        }

        const template = extractTemplateFromGuild(message.guild);
        await pool.execute(
            `INSERT INTO guild_templates (owner_id, source_guild_id, source_guild_name, template_data)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             source_guild_id = VALUES(source_guild_id),
             source_guild_name = VALUES(source_guild_name),
             template_data = VALUES(template_data)`,
            [
                message.author.id,
                template.sourceGuildId,
                template.sourceGuildName,
                JSON.stringify(template)
            ]
        );

        await sendTemporaryMessage(
            message.channel,
            `✅ ${message.guild.name} 서버 템플릿을 저장했습니다.`,
            3000
        );
    }
};
