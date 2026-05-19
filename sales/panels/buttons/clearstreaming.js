const pool = require('../../../db');
const { refreshLicensedUserPresence } = require('../../../utils/licensedUserManager');

module.exports = {
    customId: 'clear_streaming',
    requiresActiveLicense: true,
    async execute(interaction) {
        await pool.execute(
            `INSERT INTO user_settings (
                user_id,
                streaming_text,
                streaming_details,
                streaming_elapsed_seconds,
                streaming_button_label,
                streaming_button_url,
                streaming_button_label_2,
                streaming_button_url_2,
                streaming_large_image_url,
                streaming_small_image_url
            )
             VALUES (?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
             ON DUPLICATE KEY UPDATE
             streaming_text = NULL,
             streaming_details = NULL,
             streaming_elapsed_seconds = NULL,
             streaming_button_label = NULL,
             streaming_button_url = NULL,
             streaming_button_label_2 = NULL,
             streaming_button_url_2 = NULL,
             streaming_large_image_url = NULL,
             streaming_small_image_url = NULL`,
            [interaction.user.id]
        );
        await refreshLicensedUserPresence(interaction.user.id).catch(() => {});

        await interaction.reply({
            content: '스트리밍 활동을 중지했습니다.',
            ephemeral: true
        });
    }
};
