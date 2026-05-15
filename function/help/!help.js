const { buildTextCard, splitDiscordMessage } = require('../../utils/premiumText');
const { sendMessage } = require('../../utils/commandUtils');

module.exports = {
    name: '!도움말',
    aliases: ['!help'],
    description: '현재 이 계정에서 사용할 수 있는 명령어와 설명을 보여줍니다.',
    async execute(message) {
        const commands = [...message.client.commands.values()]
            .sort((left, right) => left.name.localeCompare(right.name, 'ko'));

        const lines = commands.flatMap(command => {
            const descriptionLines = String(command.description || '설명이 아직 등록되지 않았습니다.')
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean);
            const aliasLine = Array.isArray(command.aliases) && command.aliases.length > 0
                ? [`  별칭: ${command.aliases.map(alias => `\`${alias}\``).join(', ')}`]
                : [];

            return [
                `• \`${command.name}\``,
                ...aliasLine,
                ...descriptionLines.map((line, index) => `  ${index === 0 ? '설명:' : '     '} ${line}`)
            ];
        });

        const helpText = buildTextCard({
            accent: 'COMMAND CATALOG',
            title: '사용 가능한 명령어',
            subtitle: '현재 로그인된 이 계정에서 사용할 수 있는 명령만 정리했습니다.',
            sections: lines.length > 0
                ? [{ label: 'COMMANDS', lines }]
                : [{ label: 'SYSTEM', lines: ['등록된 명령어가 없습니다.'] }],
            footer: '관리자 전용 명령은 관리자 계정에서만 로드됩니다.'
        });

        for (const chunk of splitDiscordMessage(helpText)) {
            await sendMessage(message.channel, chunk);
        }
    }
};
