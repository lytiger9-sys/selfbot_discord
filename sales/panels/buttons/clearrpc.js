const pool = require('../../../db');
const { refreshLicensedUserPresence } = require('../../../utils/licensedUserManager');

module.exports = {
    customId: 'clear_rpc',
    requiresActiveLicense: true,
    async execute(interaction) {
        await pool.execute(
            `INSERT INTO user_settings (
                user_id,
                rpc_text,
                rpc_text_1,
                rpc_details_1,
                rpc_elapsed_seconds_1,
                rpc_button_label_1,
                rpc_button_url_1,
                rpc_button_label_2,
                rpc_button_url_2,
                rpc_large_image_url,
                rpc_small_image_url,
                rpc_text_2,
                rpc_details_2,
                rpc_elapsed_seconds_2
            )
             VALUES (?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
             ON DUPLICATE KEY UPDATE
             rpc_text = NULL,
             rpc_text_1 = NULL,
             rpc_details_1 = NULL,
             rpc_elapsed_seconds_1 = NULL,
             rpc_button_label_1 = NULL,
             rpc_button_url_1 = NULL,
             rpc_button_label_2 = NULL,
             rpc_button_url_2 = NULL,
             rpc_large_image_url = NULL,
             rpc_small_image_url = NULL,
             rpc_text_2 = NULL,
             rpc_details_2 = NULL,
             rpc_elapsed_seconds_2 = NULL`,
            [interaction.user.id]
        );
        await refreshLicensedUserPresence(interaction.user.id).catch(() => {});

        await interaction.reply({
            content: 'RPC 활동을 중지했습니다.',
            ephemeral: true
        });
    }
};
