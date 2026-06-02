const { ACTIVITY_BUTTON_LABELS } = require('../../utils/activityPanelText');
const { formatDateTime } = require('../../utils/premiumText');
const { getPanelStatsSnapshot } = require('./panelStats');

const COMPONENT_TYPES = Object.freeze({
    ACTION_ROW: 1,
    BUTTON: 2,
    TEXT_DISPLAY: 10,
    SEPARATOR: 14,
    CONTAINER: 17
});

const BUTTON_STYLES = Object.freeze({
    PRIMARY: 1,
    SECONDARY: 2,
    SUCCESS: 3,
    DANGER: 4
});

const COMPONENTS_V2_FLAG = 1 << 15;
const PANEL_ACCENT_COLOR = 0x5865F2;

function createTextDisplay(content) {
    return {
        type: COMPONENT_TYPES.TEXT_DISPLAY,
        content
    };
}

function createSeparator() {
    return {
        type: COMPONENT_TYPES.SEPARATOR,
        divider: true,
        spacing: 1
    };
}

function createButton(customId, label, style) {
    return {
        type: COMPONENT_TYPES.BUTTON,
        custom_id: customId,
        label,
        style
    };
}

function createActionRow(components) {
    return {
        type: COMPONENT_TYPES.ACTION_ROW,
        components
    };
}

function createGroupBlock(title, description, buttons) {
    const lines = [`### ${title}`];

    if (description) {
        lines.push(`-# ${description}`);
    }

    return [
        createTextDisplay(lines.join('\n')),
        createActionRow(buttons)
    ];
}

function createSummaryText(stats) {
    return [
        '현재 라이센스 및 인원 현황',
        '',
        `- 활성 세션: \`${stats.activeSessions}명\``,
        `- 활성 라이센스: \`${stats.activeLicenses}/${stats.totalLicenses}\``,
        `- 누적 사용자: \`${stats.totalUsers}명\``,
        `- 최근 갱신: \`${formatDateTime(stats.updatedAt, '기록 없음')}\``
    ].join('\n');
}

async function createPanel() {
    const stats = await getPanelStatsSnapshot();

    const licenseButtons = [
        createButton('start_license', '라이센스 인증', BUTTON_STYLES.PRIMARY),
        createButton('check_license', '라이센스 확인', BUTTON_STYLES.SECONDARY),
        createButton('status', '상태 확인', BUTTON_STYLES.SUCCESS),
        createButton('my_profile', '내정보', BUTTON_STYLES.SECONDARY),
        createButton('input_token', '토큰 입력', BUTTON_STYLES.SECONDARY)
    ];

    const streamingButtons = [
        createButton('streaming', ACTIVITY_BUTTON_LABELS.streaming, BUTTON_STYLES.SUCCESS),
        createButton('streaming_image', ACTIVITY_BUTTON_LABELS.streamingImage, BUTTON_STYLES.SECONDARY),
        createButton('streaming_button', ACTIVITY_BUTTON_LABELS.streamingButton, BUTTON_STYLES.PRIMARY)
    ];

    const rpcButtons = [
        createButton('rpc', ACTIVITY_BUTTON_LABELS.rpc, BUTTON_STYLES.SUCCESS),
        createButton('rpc_image', ACTIVITY_BUTTON_LABELS.rpcImage, BUTTON_STYLES.SECONDARY),
        createButton('rpc_button', ACTIVITY_BUTTON_LABELS.rpcButton, BUTTON_STYLES.PRIMARY)
    ];

    const stopButtons = [
        createButton('clear_activity', ACTIVITY_BUTTON_LABELS.clearActivity, BUTTON_STYLES.DANGER),
        createButton('clear_streaming', ACTIVITY_BUTTON_LABELS.clearStreaming, BUTTON_STYLES.SECONDARY),
        createButton('clear_rpc', ACTIVITY_BUTTON_LABELS.clearRpc, BUTTON_STYLES.SECONDARY)
    ];

    return {
        flags: COMPONENTS_V2_FLAG,
        components: [
            {
                type: COMPONENT_TYPES.CONTAINER,
                accent_color: PANEL_ACCENT_COLOR,
                components: [
                    createTextDisplay('# VELOXCORE LABS PANEL SYSTEM'),
                    createTextDisplay(createSummaryText(stats)),
                    createSeparator(),
                    ...createGroupBlock(
                        '라이센스 및 토큰 설정',
                        '라이센스 인증과 토큰 입력을 먼저 설정하세요.',
                        licenseButtons
                    ),
                    createSeparator(),
                    ...createGroupBlock(
                        '스트리밍 설정',
                        '스트리밍 표시와 버튼을 설정하세요.',
                        streamingButtons
                    ),
                    createSeparator(),
                    ...createGroupBlock(
                        'RPC 설정',
                        'RPC 표시와 버튼을 설정하세요.',
                        rpcButtons
                    ),
                    createSeparator(),
                    ...createGroupBlock(
                        '활동 중지',
                        '설정된 활동을 빠르게 종료합니다.',
                        stopButtons
                    )
                ]
            }
        ]
    };
}

module.exports = {
    createPanel
};
