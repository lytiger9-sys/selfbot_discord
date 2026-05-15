const {
    MessageEmbed,
    MessageActionRow,
    MessageButton
} = require('discord.js');

module.exports = {
    createPanel() {
        const embed = new MessageEmbed()
            .setTitle('VC Premium Control Panel')
            .setDescription(
                [
                    '라이센스 등록과 개인 활동 설정을 이 패널에서 관리합니다.',
                    '스트리밍과 RPC 1은 제목, 세부 설명, 누적 플레이타임을 저장합니다.',
                    'RPC 2는 두 번째 RPC와 함께 큰 이미지/작은 이미지를 저장하고, 공용 버튼은 가장 앞에 표시되는 활동에 최대 2개까지 붙습니다.'
                ].join('\n')
            )
            .addFields(
                {
                    name: 'License',
                    value: '`라이센스 시작` `라이센스 검증` `상태 확인` `내 정보`',
                    inline: false
                },
                {
                    name: 'Profile',
                    value: '`토큰 입력` `스트리밍 설정` `RPC 1 설정` `RPC 2 설정` `이미지 선택` `공용 버튼` `활동 끄기`',
                    inline: false
                }
            )
            .setColor('#2F6BFF')
            .setFooter({ text: 'Veloxcorelabs Premium Bot Panel' })
            .setTimestamp();

        const row1 = new MessageActionRow().addComponents(
            new MessageButton().setCustomId('start_license').setLabel('라이센스 시작').setStyle('PRIMARY'),
            new MessageButton().setCustomId('check_license').setLabel('라이센스 검증').setStyle('SECONDARY'),
            new MessageButton().setCustomId('status').setLabel('상태 확인').setStyle('SUCCESS'),
            new MessageButton().setCustomId('my_profile').setLabel('내 정보').setStyle('SECONDARY')
        );

        const row2 = new MessageActionRow().addComponents(
            new MessageButton().setCustomId('input_token').setLabel('토큰 입력').setStyle('PRIMARY'),
            new MessageButton().setCustomId('streaming').setLabel('스트리밍 설정').setStyle('SUCCESS'),
            new MessageButton().setCustomId('rpc').setLabel('RPC 1 설정').setStyle('SUCCESS'),
            new MessageButton().setCustomId('rpc_2').setLabel('RPC 2 설정').setStyle('SUCCESS'),
            new MessageButton().setCustomId('image_selecter').setLabel('이미지 선택').setStyle('SECONDARY')
        );

        const row3 = new MessageActionRow().addComponents(
            new MessageButton().setCustomId('activity_buttons').setLabel('공용 버튼').setStyle('PRIMARY'),
            new MessageButton().setCustomId('clear_activity').setLabel('활동 끄기').setStyle('DANGER')
        );

        return {
            embeds: [embed],
            components: [row1, row2, row3]
        };
    }
};
