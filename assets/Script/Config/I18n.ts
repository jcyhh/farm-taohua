type LangCode = 'zh-Hans' | 'zh-Hant' | 'en' | 'vi' | 'ko' | 'ja';

type I18nParams = Record<string, string | number | null | undefined>;
type I18nDict = Record<string, string>;

const DEFAULT_LANG: LangCode = 'zh-Hans';

const DICTS: Record<LangCode, I18nDict> = {
    'zh-Hans': {},
    'zh-Hant': {
        '背景音乐': '背景音樂',
        '开': '開',
        '关': '關',
        '音效': '音效',
        '确认': '確認',
        '返回': '返回',
        '复制成功': '複製成功',
        '灵泉水明细': '靈泉水明細',
        '桃花果明细': '桃花果明細',
        '自己': '自己',
        '对方': '對方',
        '选择不同价值的宝箱': '選擇不同價值的寶箱',
        '获取随机桃树妖进行对战': '獲取隨機桃樹妖進行對戰',
        '记录': '記錄',
        '请选择匹配': '請選擇匹配',
        '自动匹配': '自動匹配',
        '指定ID对决': '指定ID對決',
        '对决邀请': '對決邀請',
        '接受': '接受',
        '拒绝': '拒絕',
        '邀请对方对决': '邀請對方對決',
        '正在匹配中': '正在匹配中',
        '取消匹配': '取消匹配',
        '取消邀请': '取消邀請',
        '埃及金字塔': '埃及金字塔',
        '对战记录': '對戰記錄',
        '等待“{phone}”回应': '等待「{phone}」回應',
        '请输入对方手机号': '請輸入對方手機號',
        '下注金额无效': '下注金額無效',
        '收到“{phone}”用户的邀请\n对决宝箱价值【{amount}钻石】': '收到「{phone}」用戶的邀請\n對決寶箱價值【{amount}鑽石】',
        '对决胜利！恭喜获得': '對決勝利！恭喜獲得',
        '非常遗憾！对决失败': '非常遺憾！對決失敗',
        '对决平局！再接再厉': '對決平局！再接再厲',
        '平局': '平局',
        '失败': '失敗',
        '战力 {spirits}': '戰力 {spirits}',
        '邀请已超时': '邀請已超時',
        '对方取消了邀请': '對方取消了邀請',
        '对方已拒绝邀请': '對方已拒絕邀請',
        '邀请已取消': '邀請已取消',
        '邀请ID无效': '邀請ID無效',
        '拒绝邀请失败': '拒絕邀請失敗',
        '接受邀请失败': '接受邀請失敗',
        '自动匹配失败': '自動匹配失敗',
        '开启宝箱': '開啟寶箱',
        '对方手机号': '對方手機號',
        '玩家账号': '玩家帳號',
        '成功': '成功',
        '指定手机号对决': '指定手機號對決'
    },
    en: {
        '背景音乐': 'Background Music',
        '开': 'On',
        '关': 'Off',
        '音效': 'Sound Effects',
        '确认': 'Confirm',
        '复制成功': 'Copied successfully',
        '返回': 'Back',
        '灵泉水明细': 'Spring Water Details',
        '桃花果明细': 'Peach Fruit Details',
        '自己': 'Me',
        '对方': 'Opponent',
        '选择不同价值的宝箱': 'Choose treasure chests of different values',
        '获取随机桃树妖进行对战': 'Get a random peach spirit to battle',
        '记录': 'Records',
        '请选择匹配': 'Please choose a match mode',
        '自动匹配': 'Auto Match',
        '指定ID对决': 'Challenge by ID',
        '对决邀请': 'Battle Invitation',
        '接受': 'Accept',
        '拒绝': 'Reject',
        '邀请对方对决': 'Invite the other player to battle',
        '正在匹配中': 'Matching in progress',
        '取消匹配': 'Cancel Match',
        '取消邀请': 'Cancel Invitation',
        '埃及金字塔': 'Egypt Pyramid',
        '对战记录': 'Battle Records',
        '等待“{phone}”回应': 'Waiting for "{phone}" to respond',
        '请输入对方手机号': 'Please enter the other party\'s phone number',
        '下注金额无效': 'Invalid bet amount',
        '收到“{phone}”用户的邀请\n对决宝箱价值【{amount}钻石】': 'Invitation received from "{phone}"\nBattle chest value: [{amount} diamonds]',
        '对决胜利！恭喜获得': 'Battle won! Congratulations on receiving',
        '非常遗憾！对决失败': 'Unfortunately, you lost the battle',
        '对决平局！再接再厉': 'Battle draw! Keep it up',
        '平局': 'Draw',
        '失败': 'Fail',
        '战力 {spirits}': 'Power {spirits}',
        '邀请已超时': 'Invitation timed out',
        '对方取消了邀请': 'The other party cancelled the invitation',
        '对方已拒绝邀请': 'The other party has rejected the invitation',
        '邀请已取消': 'Invitation has been cancelled',
        '邀请ID无效': 'Invalid invitation ID',
        '拒绝邀请失败': 'Failed to reject invitation',
        '接受邀请失败': 'Failed to accept invitation',
        '自动匹配失败': 'Auto match failed',
        '开启宝箱': 'Open Chest',
        '对方手机号': 'Opponent Phone Number',
        '玩家账号': 'Player Account',
        '成功': 'Success',
        '指定手机号对决': 'Challenge by Phone Number',
        '输入对方ID': '输入对方ID'
    },
    vi: {
        '背景音乐': 'Nhac nen',
        '开': 'Bat',
        '关': 'Tat',
        '音效': 'Hieu ung am thanh',
        '确认': 'Xac nhan',
        '复制成功': 'Sao chep thanh cong',
        '返回': 'Quay lai',
        '灵泉水明细': 'Chi tiet nuoc linh tuyen',
        '桃花果明细': 'Chi tiet qua dao hoa',
        '自己': 'Ban than',
        '对方': 'Doi phuong',
        '选择不同价值的宝箱': 'Chon ruong bau co gia tri khac nhau',
        '获取随机桃树妖进行对战': 'Nhan ngau nhien yeu dao hoa de chien dau',
        '记录': 'Lich su',
        '请选择匹配': 'Vui long chon cach ghep tran',
        '自动匹配': 'Ghep tran tu dong',
        '指定ID对决': 'Dau voi ID chi dinh',
        '对决邀请': 'Loi moi doi dau',
        '接受': 'Dong y',
        '拒绝': 'Tu choi',
        '邀请对方对决': 'Moi doi phuong doi dau',
        '正在匹配中': 'Dang ghep tran',
        '取消匹配': 'Huy ghep tran',
        '取消邀请': 'Huy loi moi',
        '埃及金字塔': 'Kim tu thap Ai Cap',
        '对战记录': 'Lich su doi chien',
        '等待“{phone}”回应': 'Dang cho "{phone}" phan hoi',
        '请输入对方手机号': 'Vui long nhap so dien thoai doi phuong',
        '下注金额无效': 'So tien dat cuoc khong hop le',
        '收到“{phone}”用户的邀请\n对决宝箱价值【{amount}钻石】': 'Da nhan loi moi tu "{phone}"\nGia tri ruong doi chien la [{amount} kim cuong]',
        '对决胜利！恭喜获得': 'Chien thang doi chien! Chuc mung ban nhan duoc',
        '非常遗憾！对决失败': 'Rat tiec! Ban da thua trong tran doi chien',
        '对决平局！再接再厉': 'Tran dau hoa! Hay co gang hon nua',
        '平局': 'Hoa',
        '失败': 'That bai',
        '战力 {spirits}': 'Suc manh {spirits}',
        '邀请已超时': 'Loi moi da het han',
        '对方取消了邀请': 'Doi phuong da huy loi moi',
        '对方已拒绝邀请': 'Doi phuong da tu choi loi moi',
        '邀请已取消': 'Loi moi da bi huy',
        '邀请ID无效': 'ID loi moi khong hop le',
        '拒绝邀请失败': 'Tu choi loi moi that bai',
        '接受邀请失败': 'Chap nhan loi moi that bai',
        '自动匹配失败': 'Ghep tran tu dong that bai',
        '开启宝箱': 'Mo ruong bau',
        '对方手机号': 'So dien thoai doi phuong',
        '玩家账号': 'Tai khoan nguoi choi',
        '成功': 'Thanh cong',
        '指定手机号对决': 'Doi dau bang so dien thoai',
        '输入对方ID': 'Nhap ID doi phuong'
    },
    ko: {
        '背景音乐': 'BGM',
        '开': 'On',
        '关': 'Off',
        '音效': 'SFX',
        '确认': '확인',
        '复制成功': '복사 성공',
        '返回': '뒤로',
        '灵泉水明细': '영천수 내역',
        '桃花果明细': '복숭아꽃 열매 내역',
        '自己': '나',
        '对方': '상대',
        '选择不同价值的宝箱': '가치가 다른 보물상자를 선택하세요',
        '获取随机桃树妖进行对战': '무작위 복숭아 나무 요괴를 얻어 대전합니다',
        '记录': '기록',
        '请选择匹配': '매칭 방식을 선택하세요',
        '自动匹配': '자동 매칭',
        '指定ID对决': '지정 ID 대결',
        '对决邀请': '대결 초대',
        '接受': '수락',
        '拒绝': '거절',
        '邀请对方对决': '상대를 대결에 초대',
        '正在匹配中': '매칭 중',
        '取消匹配': '매칭 취소',
        '取消邀请': '초대 취소',
        '埃及金字塔': '이집트 피라미드',
        '对战记录': '대전 기록',
        '等待“{phone}”回应': '"{phone}"의 응답을 기다리는 중',
        '请输入对方手机号': '상대방의 휴대폰 번호를 입력하세요',
        '下注金额无效': '베팅 금액이 올바르지 않습니다',
        '收到“{phone}”用户的邀请\n对决宝箱价值【{amount}钻石】': '"{phone}"님의 초대를 받았습니다\n대결 보물상자 가치: [{amount} 다이아]',
        '对决胜利！恭喜获得': '대결 승리! 획득을 축하합니다',
        '非常遗憾！对决失败': '아쉽게도 대결에서 패배했습니다',
        '对决平局！再接再厉': '대결 무승부! 다음엔 더 힘내세요',
        '平局': '무승부',
        '失败': '실패',
        '战力 {spirits}': '전투력 {spirits}',
        '邀请已超时': '초대가 만료되었습니다',
        '对方取消了邀请': '상대가 초대를 취소했습니다',
        '对方已拒绝邀请': '상대가 초대를 거절했습니다',
        '邀请已取消': '초대가 취소되었습니다',
        '邀请ID无效': '초대 ID가 유효하지 않습니다',
        '拒绝邀请失败': '초대 거절 실패',
        '接受邀请失败': '초대 수락 실패',
        '自动匹配失败': '자동 매칭 실패',
        '开启宝箱': '보물상자 열기',
        '对方手机号': '상대 휴대폰 번호',
        '玩家账号': '플레이어 계정',
        '成功': '성공',
        '指定手机号对决': '휴대폰 번호로 대결 지정',
        '输入对方ID': '상대 ID 입력'
    },
    ja: {
        '背景音乐': 'BGM',
        '开': 'オン',
        '关': 'オフ',
        '音效': '効果音',
        '确认': '確認',
        '复制成功': 'コピーに成功しました',
        '返回': '戻る',
        '灵泉水明细': '霊泉水の明細',
        '桃花果明细': '桃花果の明細',
        '自己': '自分',
        '对方': '相手',
        '选择不同价值的宝箱': '異なる価値の宝箱を選択',
        '获取随机桃树妖进行对战': 'ランダムな桃樹妖を獲得して対戦',
        '记录': '記録',
        '请选择匹配': 'マッチ方式を選択してください',
        '自动匹配': '自動マッチ',
        '指定ID对决': '指定IDで対決',
        '对决邀请': '対決招待',
        '接受': '承諾',
        '拒绝': '拒否',
        '邀请对方对决': '相手を対決に招待',
        '正在匹配中': 'マッチ中',
        '取消匹配': 'マッチ取消',
        '取消邀请': '招待取消',
        '埃及金字塔': 'エジプトのピラミッド',
        '对战记录': '対戦記録',
        '等待“{phone}”回应': '"{phone}" の返答を待っています',
        '请输入对方手机号': '相手の電話番号を入力してください',
        '下注金额无效': '賭け金が無効です',
        '收到“{phone}”用户的邀请\n对决宝箱价值【{amount}钻石】': '"{phone}" さんから招待が届きました\n対決宝箱の価値【{amount}ダイヤ】',
        '对决胜利！恭喜获得': '対決勝利！獲得おめでとうございます',
        '非常遗憾！对决失败': '残念！対決に敗北しました',
        '对决平局！再接再厉': '引き分けです！次も頑張りましょう',
        '平局': '引き分け',
        '失败': '失敗',
        '战力 {spirits}': '戦力 {spirits}',
        '邀请已超时': '招待がタイムアウトしました',
        '对方取消了邀请': '相手が招待をキャンセルしました',
        '对方已拒绝邀请': '相手が招待を拒否しました',
        '邀请已取消': '招待はキャンセルされました',
        '邀请ID无效': '招待IDが無効です',
        '拒绝邀请失败': '招待の拒否に失敗しました',
        '接受邀请失败': '招待の承諾に失敗しました',
        '自动匹配失败': '自動マッチに失敗しました',
        '开启宝箱': '宝箱を開く',
        '对方手机号': '相手の電話番号',
        '玩家账号': 'プレイヤーアカウント',
        '成功': '成功',
        '指定手机号对决': '電話番号指定で対決',
        '输入对方ID': '相手のIDを入力'
    },
};

export function normalizeLang(value?: string): LangCode {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return DEFAULT_LANG;

    if (
        normalized === 'zh-hant'
        || normalized === 'zh-hk'
        || normalized === 'zh-tw'
        || normalized === 'zh-mo'
        || normalized.includes('hant')
        || normalized.includes('traditional')
    ) {
        return 'zh-Hant';
    }

    if (normalized === 'en' || normalized.startsWith('en-')) {
        return 'en';
    }

    if (normalized === 'vi' || normalized.startsWith('vi-')) {
        return 'vi';
    }

    if (normalized === 'ko' || normalized === 'ko-kr' || normalized.startsWith('ko-')) {
        return 'ko';
    }

    if (normalized === 'ja' || normalized === 'ja-jp' || normalized.startsWith('ja-')) {
        return 'ja';
    }

    return 'zh-Hans';
}

export class I18n {
    private static _lang: LangCode = DEFAULT_LANG;

    static init(lang?: string) {
        this._lang = normalizeLang(lang);
    }

    static get lang(): LangCode {
        return this._lang;
    }

    static t(key: string, params?: I18nParams) {
        const dict = DICTS[this._lang] ?? DICTS[DEFAULT_LANG];
        const template = dict[key] ?? key;
        if (!params) {
            return template;
        }

        return template.replace(/\{(\w+)\}/g, (_match, token: string) => {
            const value = params[token];
            return value != null ? String(value) : `{${token}}`;
        });
    }
}

export function t(key: string, params?: I18nParams) {
    return I18n.t(key, params);
}
