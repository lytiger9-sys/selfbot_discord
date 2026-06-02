const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js-selfbot-v13');
const pool = require('../db');
const {
    deleteMessage,
    isMasterUser,
    replyMessage,
    sendTemporaryMessage
} = require('./commandUtils');

function loadRecursive(baseDir, collection) {
    const fullPath = path.join(__dirname, '..', baseDir);
    if (!fs.existsSync(fullPath)) return;

    for (const file of fs.readdirSync(fullPath)) {
        const filePath = path.join(fullPath, file);

        if (fs.lstatSync(filePath).isDirectory()) {
            loadRecursive(path.join(baseDir, file), collection);
            continue;
        }

        if (!file.endsWith('.js')) continue;

        try {
            const item = require(filePath);
            if (item?.name) {
                Object.defineProperty(item, '__sourcePath', {
                    configurable: true,
                    enumerable: false,
                    value: path.relative(path.join(__dirname, '..'), filePath),
                    writable: true
                });
                collection.set(item.name, item);
            }
        } catch (error) {
            console.error(`[Command Load] ${path.relative(path.join(__dirname, '..'), filePath)}`, error.message);
        }
    }
}

function createCommandCollection({ includeAdminCommands = false } = {}) {
    const commands = new Collection();
    loadRecursive('function', commands);

    if (includeAdminCommands) {
        loadRecursive('sales/admin', commands);
    }

    return commands;
}

function getCommandTriggers(command) {
    return [...new Set(
        [command.name, ...(Array.isArray(command.aliases) ? command.aliases : [])]
            .filter(Boolean)
            .map(trigger => String(trigger).trim())
    )];
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTriggerPattern(trigger) {
    const escapedTrigger = escapeRegExp(trigger).replace(/\\ /g, '\\s+');
    return new RegExp(`^${escapedTrigger}(?:$|\\s+)`, 'u');
}

function findCommandMatch(collection, content) {
    const trimmedContent = content.trim();

    return [...collection.values()]
        .flatMap(command => getCommandTriggers(command).map(trigger => ({
            command,
            trigger,
            pattern: buildTriggerPattern(trigger)
        })))
        .sort((left, right) => right.trigger.length - left.trigger.length)
        .find(match => match.pattern.test(trimmedContent));
}

function extractRawArgs(content, match) {
    if (!match) return '';

    const trimmedContent = content.trim();
    const prefixMatch = trimmedContent.match(match.pattern);
    if (!prefixMatch) return '';

    return trimmedContent.slice(prefixMatch[0].length).trim();
}

function shouldAutoReplyAfk(message, clientUserId) {
    if (!message || !clientUserId) return false;
    if (message.author?.id === clientUserId) return false;
    if (message.mentions?.everyone) return false;
    if (message.reference?.messageId) return false;
    if (!message.mentions?.users?.has(clientUserId)) return false;
    if ((message.mentions.users?.size || 0) !== 1) return false;
    if ((message.mentions.roles?.size || 0) > 0) return false;
    return true;
}

function attachCommandMessageHandler(client) {
    client.on('messageCreate', async message => {
        if (message.author.id !== client.user.id) {
            if (shouldAutoReplyAfk(message, client.user.id)) {
                const [rows] = await pool.execute(
                    'SELECT afk_enabled, afk_message FROM user_settings WHERE user_id = ?',
                    [client.user.id]
                );

                if (rows[0]?.afk_enabled) {
                    await replyMessage(message, rows[0].afk_message || 'AFK 상태입니다.').catch(() => {});
                }
            }
            return;
        }

        const content = message.content.trim();
        if (!content.startsWith('!')) return;

        const match = findCommandMatch(client.commands, content);
        if (!match) return;

        const { command } = match;

        try {
            if (command.adminOnly && !isMasterUser(message.author.id)) {
                await sendTemporaryMessage(message.channel, '이 명령어는 관리자만 사용할 수 있습니다.', 2000);
                return;
            }

            const rawArgs = extractRawArgs(content, match);
            const args = rawArgs ? rawArgs.split(/\s+/) : [];
            await command.execute(message, args, rawArgs);
        } catch (error) {
            console.error(error);
            await sendTemporaryMessage(message.channel, '명령어 실행 중 오류가 발생했습니다.', 2000).catch(() => {});
        } finally {
            await deleteMessage(message).catch(() => {});
        }
    });
}

module.exports = {
    attachCommandMessageHandler,
    createCommandCollection,
    extractRawArgs,
    findCommandMatch,
    getCommandTriggers,
    loadRecursive,
    shouldAutoReplyAfk
};
