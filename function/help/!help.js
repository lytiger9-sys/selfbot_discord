const path = require('path');
const { buildTextCard, splitDiscordMessage } = require('../../utils/premiumText');
const { sendMessage } = require('../../utils/commandUtils');

function getCommandGroupLabel(command) {
    const sourcePath = String(command.__sourcePath || '');
    const sourceDir = path.dirname(sourcePath);

    if (!sourceDir || sourceDir === '.') {
        return '기타';
    }

    const functionPrefix = `function${path.sep}`;
    const relativeDir = sourceDir.startsWith(functionPrefix)
        ? sourceDir.slice(functionPrefix.length)
        : sourceDir;

    if (!relativeDir || relativeDir === '.' || relativeDir === 'function') {
        return '기타';
    }

    return relativeDir
        .split(path.sep)
        .filter(Boolean)
        .map(segment => segment.toUpperCase())
        .join(' / ');
}

function formatCommandSummary(command) {
    const descriptionLines = String(command.description || '설명 없음')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

    if (descriptionLines.length === 0) {
        return [`- \`${command.name}\``, '  설명 없음'];
    }

    return [`- \`${command.name}\``, ...descriptionLines.map(line => `  ${line}`)];
}

function buildHelpText(sections) {
    return buildTextCard({
        accent: 'HELP',
        title: '명령어 목록',
        subtitle: '메인: `!도움말` | alias: `!help`',
        sections,
    });
}

module.exports = {
    name: '!도움말',
    aliases: ['!help'],
    description: '현재 이 계정에서 사용할 수 있는 명령어를 폴더별로 모아 보여줍니다.',
    async execute(message) {
        const commands = [...message.client.commands.values()]
            .filter(command => command?.name && String(command.__sourcePath || '').startsWith('function'))
            .sort((left, right) => left.name.localeCompare(right.name, 'ko'));

        const groupedCommands = new Map();

        for (const command of commands) {
            const groupLabel = getCommandGroupLabel(command);
            if (!groupedCommands.has(groupLabel)) {
                groupedCommands.set(groupLabel, []);
            }

            groupedCommands.get(groupLabel).push(command);
        }

        const sections = [...groupedCommands.entries()]
            .sort((left, right) => left[0].localeCompare(right[0], 'ko'))
            .map(([groupLabel, grouped]) => ({
                label: groupLabel,
                lines: grouped.flatMap(formatCommandSummary)
            }));

        const helpText = buildHelpText(sections);

        for (const chunk of splitDiscordMessage(helpText)) {
            await sendMessage(message.channel, chunk);
        }
    }
};
