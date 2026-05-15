const pool = require('../../db');
const { sendTemporaryMessage } = require('../../utils/commandUtils');
const { extractRoleTemplateFromGuild } = require('../../utils/roleTemplateUtils');

module.exports = {
    name: '!역할 복사',
    description: '현재 서버의 역할 이름과 색상만 저장합니다.',
    async execute(message) {
        if (!message.guild) {
            return sendTemporaryMessage(message.channel, '이 명령어는 서버 안에서만 사용할 수 있습니다.', 3000);
        }

        const template = extractRoleTemplateFromGuild(message.guild);
        await pool.execute(
            `INSERT INTO role_templates (owner_id, source_guild_id, source_guild_name, role_data)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             source_guild_id = VALUES(source_guild_id),
             source_guild_name = VALUES(source_guild_name),
             role_data = VALUES(role_data)`,
            [
                message.author.id,
                template.sourceGuildId,
                template.sourceGuildName,
                JSON.stringify(template)
            ]
        );

        await sendTemporaryMessage(
            message.channel,
            `역할 템플릿을 저장했습니다. (${template.roles.length}개)`,
            3000
        );
    }
};
