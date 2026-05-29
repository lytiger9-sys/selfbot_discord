const pool = require('../../../db');
const { ACTIVITY_PANEL_STATUS_TEXT } = require('../../../utils/activityPanelText');
const { refreshLicensedUserPresence } = require('../../../utils/licensedUserManager');

module.exports = {
    customId: 'clear_activity',
    requiresActiveLicense: true,
    async execute(interaction) {
        await pool.execute(
            `INSERT INTO user_settings (
                user_id,
                streaming_text,
                streaming_details,
                streaming_url,
                streaming_elapsed_seconds,
                streaming_button_label,
                streaming_button_url,
                streaming_button_label_2,
                streaming_button_url_2,
                streaming_large_image_url,
                streaming_small_image_url,
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
             VALUES (?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
             ON DUPLICATE KEY UPDATE
             streaming_text = NULL,
             streaming_details = NULL,
             streaming_url = NULL,
             streaming_elapsed_seconds = NULL,
             streaming_button_label = NULL,
             streaming_button_url = NULL,
             streaming_button_label_2 = NULL,
             streaming_button_url_2 = NULL,
             streaming_large_image_url = NULL,
             streaming_small_image_url = NULL,
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
            content: ACTIVITY_PANEL_STATUS_TEXT.clearedAll,
            ephemeral: true
        });
    }
};
