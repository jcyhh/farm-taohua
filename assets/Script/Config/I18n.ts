type LangCode = 'zh-Hans' | 'zh-Hant' | 'en';

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
        '指定手机号对决': 'Challenge by Phone Number'
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
