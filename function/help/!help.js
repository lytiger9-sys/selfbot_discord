const path = require('path');
const { buildTextCard, splitDiscordMessage } = require('../../utils/premiumText');
const { sendMessage } = require('../../utils/commandUtils');

const FUNCTION_ROOT = `function${path.sep}`;
const ADMIN_ROOT = `sales${path.sep}admin`;
const PRIORITY_GROUPS = new Map([
    ['관리자', 0],
    ['LICENSE', 1],
    ['BANK', 2]
]);

function shouldDisplayCommand(command) {
    const sourcePath = String(command.__sourcePath || '');
    return Boolean(
        command.adminOnly
        || sourcePath.startsWith(FUNCTION_ROOT)
        || sourcePath.startsWith(ADMIN_ROOT)
    );
}

function getCommandGroupLabel(command) {
    const sourcePath = String(command.__sourcePath || '');
    const sourceDir = path.dirname(sourcePath);

    if (!sourceDir || sourceDir === '.') {
        return '기타';
    }

    if (command.adminOnly || sourceDir.startsWith(ADMIN_ROOT)) {
        return '관리자';
    }

    const relativeDir = sourceDir.startsWith(FUNCTION_ROOT)
        ? sourceDir.slice(FUNCTION_ROOT.length)
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

function compareGroupLabels(left, right) {
    const leftPriority = PRIORITY_GROUPS.get(left);
    const rightPriority = PRIORITY_GROUPS.get(right);

    if (leftPriority !== undefined || rightPriority !== undefined) {
        return (leftPriority ?? 99) - (rightPriority ?? 99);
    }

    return left.localeCompare(right, 'ko');
}

function formatCommandSummary(command) {
    const descriptionLines = String(command.description || '설명이 등록되지 않았습니다.')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

    const lines = [`- \`${command.name}\``];
    lines.push(
        descriptionLines.length > 0
            ? `  ${descriptionLines.join(' / ')}`
            : '  설명이 등록되지 않았습니다.'
    );

    return lines;
}

module.exports = {
    name: '!도움말',
    aliases: ['!help'],
    description: '현재 이 계정에서 사용할 수 있는 명령어를 폴더별로 모아 보여줍니다.',
    async execute(message) {
        const commands = [...message.client.commands.values()]
            .filter(command => command?.name && shouldDisplayCommand(command))
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
            .sort((left, right) => compareGroupLabels(left[0], right[0]))
            .map(([groupLabel, grouped]) => ({
                label: groupLabel,
                lines: grouped.flatMap(formatCommandSummary)
            }));

        const helpText = buildTextCard({
            accent: 'HELP',
            title: '명령어 목록',
            subtitle: '메인: `!도움말` | alias: `!help`',
            sections
        });

        for (const chunk of splitDiscordMessage(helpText)) {
            await sendMessage(message.channel, chunk);
        }
    }
};
