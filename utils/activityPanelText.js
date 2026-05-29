const ACTIVITY_BUTTON_LABELS = Object.freeze({
    streaming: '스트리밍 설정',
    rpc: 'RPC 설정',
    streamingImage: '스트리밍 사진 설정',
    rpcImage: 'RPC 사진 설정',
    streamingButton: '스트리밍 버튼 설정',
    rpcButton: 'RPC 버튼 설정',
    clearStreaming: '스트리밍 중지',
    clearRpc: 'RPC 중지',
    clearActivity: '모든 활동 중지'
});

const STREAMING_PANEL_TEXT = Object.freeze({
    modalTitle: '스트리밍 설정',
    titleLabel: '제목',
    titlePlaceholder: '예: 문의 DM | 24H',
    detailsLabel: '설명',
    detailsPlaceholder: '예: 새벽 문의 응대 중',
    elapsedLabel: '경과 시간',
    elapsedPlaceholder: '24:53:01 또는 53:01',
    urlLabel: '송출 링크(URL)',
    urlPlaceholder: 'https://twitch.tv/... 또는 https://youtube.com/...',
    saved: '스트리밍을 설정했습니다.',
    cleared: '스트리밍 활동을 중지했습니다.',
    saveFailed: '스트리밍 설정 중 오류가 발생했습니다.'
});

const RPC_PANEL_TEXT = Object.freeze({
    modalTitle: 'RPC 설정',
    titleLabel: '제목',
    titlePlaceholder: '예: Visual Studio Code',
    detailsLabel: '설명',
    detailsPlaceholder: '선택 입력',
    elapsedLabel: '경과 시간',
    elapsedPlaceholder: '24:53:01 또는 53:01',
    saved: 'RPC를 설정했습니다.',
    cleared: 'RPC 활동을 중지했습니다.',
    saveFailed: 'RPC 설정 중 오류가 발생했습니다.'
});

const STREAMING_BUTTON_PANEL_TEXT = Object.freeze({
    modalTitle: '스트리밍 버튼 설정',
    firstLabelName: '버튼 1 이름',
    firstLabelPlaceholder: '예: Prime Service',
    firstUrlLabel: '버튼 1 링크',
    firstUrlPlaceholder: 'https://example.com',
    secondLabelName: '버튼 2 이름',
    secondLabelPlaceholder: '선택 입력',
    secondUrlLabel: '버튼 2 링크',
    secondUrlPlaceholder: 'https://example.com',
    saved: '스트리밍 버튼 설정을 저장했습니다.',
    saveFailed: '스트리밍 버튼 설정 중 오류가 발생했습니다.'
});

const RPC_BUTTON_PANEL_TEXT = Object.freeze({
    modalTitle: 'RPC 버튼 설정',
    firstLabelName: '버튼 1 이름',
    firstLabelPlaceholder: '예: Prime Service',
    firstUrlLabel: '버튼 1 링크',
    firstUrlPlaceholder: 'https://example.com',
    secondLabelName: '버튼 2 이름',
    secondLabelPlaceholder: '선택 입력',
    secondUrlLabel: '버튼 2 링크',
    secondUrlPlaceholder: 'https://example.com',
    saved: 'RPC 버튼 설정을 저장했습니다.',
    saveFailed: 'RPC 버튼 설정 중 오류가 발생했습니다.'
});

const STREAMING_IMAGE_PANEL_TEXT = Object.freeze({
    modalTitle: '스트리밍 사진 설정',
    largeImageLabel: '큰 이미지 URL',
    smallImageLabel: '작은 이미지 URL',
    imagePlaceholder: 'https://cdn.discordapp.com/... 또는 asset id',
    saved: '스트리밍 사진 설정을 저장했습니다. 비우면 해당 이미지를 제거합니다.'
});

const RPC_IMAGE_PANEL_TEXT = Object.freeze({
    modalTitle: 'RPC 사진 설정',
    largeImageLabel: '큰 이미지 URL',
    smallImageLabel: '작은 이미지 URL',
    imagePlaceholder: 'https://cdn.discordapp.com/... 또는 asset id',
    saved: 'RPC 사진 설정을 저장했습니다. 비우면 해당 이미지를 제거합니다.'
});

const ACTIVITY_PANEL_VALIDATION_TEXT = Object.freeze({
    invalidElapsed: '경과 시간은 `24:53:01` 또는 `53:01` 형식으로 입력해 주세요.',
    invalidStreamingUrl: '스트리밍 링크는 `https://twitch.tv/...` 또는 `https://youtube.com/...` 형식이어야 합니다.',
    incompleteButtonPair: '버튼 이름과 링크를 각각 같이 입력하거나 둘 다 비워 주세요.',
    invalidButtonUrl: '버튼 링크는 `https://` 또는 `http://` 형식이어야 합니다.'
});

const ACTIVITY_PANEL_STATUS_TEXT = Object.freeze({
    clearedAll: '스트리밍과 RPC 활동을 모두 중지했습니다.'
});

module.exports = {
    ACTIVITY_BUTTON_LABELS,
    ACTIVITY_PANEL_STATUS_TEXT,
    ACTIVITY_PANEL_VALIDATION_TEXT,
    RPC_BUTTON_PANEL_TEXT,
    RPC_IMAGE_PANEL_TEXT,
    RPC_PANEL_TEXT,
    STREAMING_BUTTON_PANEL_TEXT,
    STREAMING_IMAGE_PANEL_TEXT,
    STREAMING_PANEL_TEXT
};
