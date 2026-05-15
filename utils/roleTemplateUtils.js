const { runDiscordAction } = require('./commandUtils');

function extractRoleTemplateFromGuild(guild) {
    const roles = guild.roles.cache
        .filter(role => role.id !== guild.id && !role.managed)
        .sort((left, right) => left.position - right.position)
        .map(role => ({
            name: role.name,
            color: role.color
        }));

    return {
        sourceGuildId: guild.id,
        sourceGuildName: guild.name,
        roles
    };
}

async function applyRoleTemplateToGuild(guild, template) {
    const createdRoles = [];

    for (const roleData of template.roles || []) {
        const createdRole = await runDiscordAction(() => guild.roles.create({
            name: roleData.name,
            color: roleData.color,
            reason: 'Applying saved role template'
        }).catch(() => null));

        if (createdRole) {
            createdRoles.push(createdRole);
        }
    }

    if (!createdRoles.length) {
        return;
    }

    const positions = createdRoles.map((role, index) => ({
        role: role.id,
        position: index + 1
    }));

    await runDiscordAction(() => guild.roles.setPositions(positions).catch(() => null));
}

module.exports = {
    applyRoleTemplateToGuild,
    extractRoleTemplateFromGuild
};
