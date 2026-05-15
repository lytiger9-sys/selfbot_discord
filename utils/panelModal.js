const { Modal } = require('discord.js');

function createPanelModal(interaction, { customId, title, components }) {
    return new Modal()
        .setCustomId(customId)
        .setTitle(title)
        .addComponents(...components);
}

module.exports = {
    createPanelModal
};
