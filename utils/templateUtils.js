const {
    runDiscordAction
} = require('./commandUtils');

function serializePermissionOverwrites(channel, sourceGuildId) {
    return channel.permissionOverwrites.cache
        .filter(overwrite => overwrite.id === sourceGuildId || overwrite.type === 'role')
        .map(overwrite => ({
            sourceId: overwrite.id,
            type: overwrite.type,
            allow: overwrite.allow.bitfield.toString(),
            deny: overwrite.deny.bitfield.toString()
        }));
}

function resolvePermissionOverwrites(overwrites, sourceGuildId, targetGuildId, roleMap) {
    return overwrites
        .map(overwrite => {
            const mappedId = overwrite.sourceId === sourceGuildId
                ? targetGuildId
                : roleMap.get(overwrite.sourceId);

            if (!mappedId) return null;

            return {
                id: mappedId,
                type: overwrite.type,
                allow: overwrite.allow,
                deny: overwrite.deny
            };
        })
        .filter(Boolean);
}

function getChannelPosition(channel) {
    return typeof channel.rawPosition === 'number'
        ? channel.rawPosition
        : channel.position || 0;
}

function extractTemplateFromGuild(guild) {
    const roles = guild.roles.cache
        .filter(role => role.id !== guild.id && !role.managed)
        .sort((left, right) => left.position - right.position)
        .map(role => ({
            sourceId: role.id,
            name: role.name,
            color: role.color,
            hoist: role.hoist,
            mentionable: role.mentionable,
            permissions: role.permissions.bitfield.toString(),
            position: role.position
        }));

    const categories = guild.channels.cache
        .filter(channel => channel.type === 'GUILD_CATEGORY')
        .sort((left, right) => getChannelPosition(left) - getChannelPosition(right))
        .map(channel => ({
            sourceId: channel.id,
            name: channel.name,
            position: getChannelPosition(channel),
            permissionOverwrites: serializePermissionOverwrites(channel, guild.id)
        }));

    const textChannels = guild.channels.cache
        .filter(channel => ['GUILD_TEXT', 'GUILD_NEWS'].includes(channel.type))
        .sort((left, right) => {
            const leftParent = left.parent ? getChannelPosition(left.parent) : Number.MAX_SAFE_INTEGER;
            const rightParent = right.parent ? getChannelPosition(right.parent) : Number.MAX_SAFE_INTEGER;

            if (leftParent !== rightParent) return leftParent - rightParent;
            return getChannelPosition(left) - getChannelPosition(right);
        })
        .map(channel => ({
            sourceId: channel.id,
            name: channel.name,
            type: channel.type,
            topic: channel.topic || '',
            nsfw: Boolean(channel.nsfw),
            rateLimitPerUser: channel.rateLimitPerUser || 0,
            parentSourceId: channel.parentId || null,
            position: getChannelPosition(channel),
            permissionOverwrites: serializePermissionOverwrites(channel, guild.id)
        }));

    return {
        sourceGuildId: guild.id,
        sourceGuildName: guild.name,
        roles,
        categories,
        textChannels
    };
}

async function applyTemplateToGuild(guild, template) {
    const removableChannels = guild.channels.cache
        .filter(channel => ['GUILD_TEXT', 'GUILD_NEWS', 'GUILD_CATEGORY'].includes(channel.type))
        .sort((left, right) => getChannelPosition(right) - getChannelPosition(left));

    for (const channel of removableChannels.values()) {
        await runDiscordAction(() => channel.delete('Applying saved server template').catch(() => null));
    }

    const removableRoles = guild.roles.cache
        .filter(role => role.id !== guild.id && !role.managed)
        .sort((left, right) => left.position - right.position);

    for (const role of removableRoles.values()) {
        await runDiscordAction(() => role.delete('Applying saved server template').catch(() => null));
    }

    const roleMap = new Map();

    for (const roleData of template.roles) {
        const createdRole = await runDiscordAction(() => guild.roles.create({
            name: roleData.name,
            color: roleData.color,
            hoist: roleData.hoist,
            mentionable: roleData.mentionable,
            permissions: roleData.permissions,
            reason: 'Applying saved server template'
        }));

        roleMap.set(roleData.sourceId, createdRole.id);
    }

    const rolePositions = template.roles
        .map(roleData => ({
            role: roleMap.get(roleData.sourceId),
            position: roleData.position
        }))
        .filter(role => role.role);

    if (rolePositions.length > 0) {
        await runDiscordAction(() => guild.roles.setPositions(rolePositions));
    }

    const categoryMap = new Map();

    for (const categoryData of template.categories) {
        const createdCategory = await runDiscordAction(() => guild.channels.create(categoryData.name, {
            type: 'GUILD_CATEGORY',
            position: categoryData.position,
            permissionOverwrites: resolvePermissionOverwrites(
                categoryData.permissionOverwrites,
                template.sourceGuildId,
                guild.id,
                roleMap
            ),
            reason: 'Applying saved server template'
        }));

        categoryMap.set(categoryData.sourceId, createdCategory.id);
    }

    for (const channelData of template.textChannels) {
        await runDiscordAction(() => guild.channels.create(channelData.name, {
            type: channelData.type,
            topic: channelData.topic || undefined,
            nsfw: channelData.nsfw,
            rateLimitPerUser: channelData.rateLimitPerUser,
            parent: channelData.parentSourceId ? categoryMap.get(channelData.parentSourceId) : undefined,
            position: channelData.position,
            permissionOverwrites: resolvePermissionOverwrites(
                channelData.permissionOverwrites,
                template.sourceGuildId,
                guild.id,
                roleMap
            ),
            reason: 'Applying saved server template'
        }));
    }
}

module.exports = {
    applyTemplateToGuild,
    extractTemplateFromGuild
};
