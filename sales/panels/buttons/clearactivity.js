const pool = require('../../../db');

module.exports = {
    customId: 'clear_activity',
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
                rpc_text,
                rpc_text_1,
                rpc_details_1,
                rpc_elapsed_seconds_1,
                rpc_button_label_1,
                rpc_button_url_1,
                rpc_text_2,
                rpc_details_2,
                rpc_elapsed_seconds_2,
                rpc_button_label_2,
                rpc_button_url_2
            )
             VALUES (?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
             ON DUPLICATE KEY UPDATE
             streaming_text = NULL,
             streaming_details = NULL,
             streaming_elapsed_seconds = NULL,
             streaming_button_label = NULL,
             streaming_button_url = NULL,
             rpc_text = NULL,
             rpc_text_1 = NULL,
             rpc_details_1 = NULL,
             rpc_elapsed_seconds_1 = NULL,
             rpc_button_label_1 = NULL,
             rpc_button_url_1 = NULL,
             rpc_text_2 = NULL,
             rpc_details_2 = NULL,
             rpc_elapsed_seconds_2 = NULL,
             rpc_button_label_2 = NULL,
             rpc_button_url_2 = NULL`,
            [interaction.user.id]
        );

        await interaction.reply({
            content: '현재 저장된 스트리밍/RPC 활동을 모두 껐습니다. 다음 동기화 주기에 반영됩니다.',
            ephemeral: true
        });
    }
};
