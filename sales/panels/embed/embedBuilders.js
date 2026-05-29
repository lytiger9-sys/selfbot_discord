const {
    MessageEmbed,
    MessageActionRow,
    MessageButton
} = require('discord.js');
const { ACTIVITY_BUTTON_LABELS } = require('../../../utils/activityPanelText');
const { formatDateTime } = require('../../../utils/premiumText');
const { getPanelStatsSnapshot } = require('../panelStats');

async function createPanel() {
    const stats = await getPanelStatsSnapshot();

    const embed = new MessageEmbed()
        .setTitle('VELOXCORE LABS PANEL SYSTEM')
        .setDescription(
            [
                '라이선스 인증 사용자만 모든 기능을 사용할 수 있습니다.',
                `활성 세션: \`${stats.activeSessions}명\``,
                `라이선스 현황: \`${stats.activeLicenses}/${stats.totalLicenses}\``,
                `누적 사용자 수: \`${stats.totalUsers}명\``,
                `최근 갱신: \`${formatDateTime(stats.updatedAt, 'N/A')}\``,
                '',
                '스트리밍과 RPC는 각각 따로 설정하고, 각각 따로 중지할 수 있습니다.'
            ].join('\n')
        )
        .addFields(
            {
                name: '라이선스',
                value: '`라이선스 인증` `라이선스 확인` `상태 확인` `내 정보`',
                inline: false
            },
            {
                name: '활동 설정',
                value: '`토큰 입력` `스트리밍 설정` `RPC 설정` `스트리밍 사진 설정` `RPC 사진 설정`',
                inline: false
            },
            {
                name: '버튼 및 중지',
                value: '`스트리밍 버튼 설정` `RPC 버튼 설정` `스트리밍 중지` `RPC 중지` `모든 활동 중지`',
                inline: false
            }
        )
        .setColor('#5865F2')
        .setFooter({ text: 'Veloxcorelabs Client Panel' })
        .setTimestamp(stats.updatedAt);

    const row1 = new MessageActionRow().addComponents(
        new MessageButton().setCustomId('start_license').setLabel('라이선스 인증').setStyle('PRIMARY'),
        new MessageButton().setCustomId('check_license').setLabel('라이선스 확인').setStyle('SECONDARY'),
        new MessageButton().setCustomId('status').setLabel('상태 확인').setStyle('SUCCESS'),
        new MessageButton().setCustomId('my_profile').setLabel('내 정보').setStyle('SECONDARY')
    );

    const row2 = new MessageActionRow().addComponents(
        new MessageButton().setCustomId('input_token').setLabel('토큰 입력').setStyle('PRIMARY'),
        new MessageButton().setCustomId('streaming').setLabel(ACTIVITY_BUTTON_LABELS.streaming).setStyle('SUCCESS'),
        new MessageButton().setCustomId('rpc').setLabel(ACTIVITY_BUTTON_LABELS.rpc).setStyle('SUCCESS'),
        new MessageButton().setCustomId('streaming_image').setLabel(ACTIVITY_BUTTON_LABELS.streamingImage).setStyle('SECONDARY'),
        new MessageButton().setCustomId('rpc_image').setLabel(ACTIVITY_BUTTON_LABELS.rpcImage).setStyle('SECONDARY')
    );

    const row3 = new MessageActionRow().addComponents(
        new MessageButton().setCustomId('streaming_button').setLabel(ACTIVITY_BUTTON_LABELS.streamingButton).setStyle('PRIMARY'),
        new MessageButton().setCustomId('rpc_button').setLabel(ACTIVITY_BUTTON_LABELS.rpcButton).setStyle('PRIMARY'),
        new MessageButton().setCustomId('clear_streaming').setLabel(ACTIVITY_BUTTON_LABELS.clearStreaming).setStyle('DANGER'),
        new MessageButton().setCustomId('clear_rpc').setLabel(ACTIVITY_BUTTON_LABELS.clearRpc).setStyle('DANGER'),
        new MessageButton().setCustomId('clear_activity').setLabel(ACTIVITY_BUTTON_LABELS.clearActivity).setStyle('DANGER')
    );

    return {
        embeds: [embed],
        components: [row1, row2, row3]
    };
}

module.exports = {
    createPanel
};
