type LangCode = 'zh-Hans' | 'zh-Hant' | 'en';

type I18nParams = Record<string, string | number | null | undefined>;
type I18nDict = Record<string, string>;

const DEFAULT_LANG: LangCode = 'zh-Hans';

const DICTS: Record<LangCode, I18nDict> = {
    'zh-Hans': {},
    'zh-Hant': {
        '沙土地': '沙土地',
        '褐土地': '褐土地',
        '金土地': '金土地',
        '红土地': '紅土地',
        '黑土地': '黑土地',
        '桃花客栈': '桃花客棧',
        '土地': '土地',
        '背景音乐': '背景音樂',
        '开': '開',
        '关': '關',
        '音效': '音效',
        '种子商城': '種子商城',
        '行者币': '行者幣',
        '灵石': '靈石',
        '确认': '確認',
        '背包': '背包',
        '种子': '種子',
        '果实': '果實',
        '桃树果': '桃樹果',
        '拥有': '擁有',
        '兑换': '兌換',
        '桃花果≈1灵石': '桃花果≈1靈石',
        '我的桃花果 : 0': '我的桃花果 : 0',
        '手续费 : 0%': '手續費 : 0%',
        '总计 : 0灵石': '總計 : 0靈石',
        '桃花果': '桃花果',
        '≈1灵石': '≈1靈石',
        '桃花源正式开启内测阶段\n现招募体验玩家 连续签到打卡{gift_cycle}天\n送体验桃花树{gift_amount}棵 生命周期{seed_cycle}天\n限量{gift_limit}席':
            '桃花源正式開啟內測階段\n現招募體驗玩家 連續簽到打卡{gift_cycle}天\n送體驗桃花樹{gift_amount}棵 生命週期{seed_cycle}天\n限量{gift_limit}席',
        '每日签到': '每日簽到',
        '状态': '狀態',
        '00:00:00 后成熟': '00:00:00 後成熟',
        '0/0天': '0/0天',
        '可采摘 0 桃花果': '可採摘 0 桃花果',
        '购买成功': '購買成功',
        '兑换比例异常': '兌換比例異常',
        '请输入兑换数量': '請輸入兌換數量',
        '兑换数量不符合比例': '兌換數量不符合比例',
        '桃花果不足': '桃花果不足',
        '兑换成功': '兌換成功',
        '我的桃花果 : {count}': '我的桃花果 : {count}',
        '手续费 : {fee}%': '手續費 : {fee}%',
        '总计 : {count}灵石': '總計 : {count}靈石',
        '{count}桃花果≈1灵石': '{count}桃花果≈1靈石',
        '{count}桃花果': '{count}桃花果',
        '<bold>是否购买价值<color=#FF0084>{total}USDT</color>{name}种子</bold>': '<bold>是否購買價值<color=#FF0084>{total}USDT</color>{name}種子</bold>',
        '春启灵壤，万物生香，全新种植平台现已开放，从灵苗初绽到枝繁叶茂，全程可视化成长，沉浸式体验国风仙侠种植乐趣。': '春啟靈壤，萬物生香，全新種植平台現已開放，從靈苗初綻到枝繁葉茂，全程可視化成長，沉浸式體驗國風仙俠種植樂趣。',
        '今日已签到': '今日已簽到',
        '今日未签到': '今日未簽到',
        '今日徒步未达标': '今日徒步未達標',
        '已连续签到{days}天': '已連續簽到{days}天',
        '今日徒步{stepCount}/{signSteps}km': '今日徒步{stepCount}/{signSteps}km',
        '已签到': '已簽到',
        '签到': '簽到',
        '签到成功': '簽到成功',
        '今日已签到，无法重复签到': '今日已簽到，無法重複簽到',
        '待浇水': '待澆水',
        '成长中': '成長中',
        '待采摘': '待採摘',
        '枯萎待铲除': '枯萎待鏟除',
        '{ripeDay}/{cycle}天': '{ripeDay}/{cycle}天',
        '可采摘{count}桃花果': '可採摘{count}桃花果',
        '{time}后成熟': '{time}後成熟',
        '土地状态数据异常': '土地狀態資料異常',
        '浇水成功': '澆水成功',
        '采摘成功': '採摘成功',
        '铲除成功': '鏟除成功',
        '生命周期': '生命週期',
        '库存': '庫存',
        '返回': '返回',
        '灵泉水明细': '靈泉水明細',
        '桃花果明细': '桃花果明細',
        '{ripeYield}/{countYield}桃花果': '{ripeYield}/{countYield}桃花果'
    },
    en: {
        '沙土地': 'Sandy Land',
        '褐土地': 'Brown Land',
        '金土地': 'Golden Land',
        '红土地': 'Red Land',
        '黑土地': 'Black Land',
        '桃花客栈': 'Peach Blossom Inn',
        '土地': 'Land',
        '背景音乐': 'Background Music',
        '开': 'On',
        '关': 'Off',
        '音效': 'Sound Effects',
        '种子商城': 'Seed Shop',
        '行者币': 'Walker Coin',
        '灵石': 'Fairy Stone',
        '确认': 'Confirm',
        '背包': 'Backpack',
        '种子': 'Seeds',
        '果实': 'Fruits',
        '桃树果': 'Peach Fruit',
        '拥有': 'Owned',
        '兑换': 'Exchange',
        '桃花果≈1灵石': 'Peach Fruit ≈ 1 Fairy Stone',
        '我的桃花果 : 0': 'My Peach Fruit : 0',
        '手续费 : 0%': 'Fee : 0%',
        '总计 : 0灵石': 'Total : 0 Fairy Stone',
        '桃花果': 'Peach Fruit',
        '≈1灵石': '≈1 Fairy Stone',
        '生命周期': 'Lifecycle',
        '库存': 'Stock',
        '桃花源正式开启内测阶段\n现招募体验玩家 连续签到打卡{gift_cycle}天\n送体验桃花树{gift_amount}棵 生命周期{seed_cycle}天\n限量{gift_limit}席':
            'Peach Blossom Spring is now in closed beta.\nWe are recruiting trial players: check in for {gift_cycle} consecutive days.\nReceive {gift_amount} trial peach trees, lifecycle {seed_cycle} days.\nLimited to {gift_limit} spots.',
        '每日签到': 'Daily Check-in',
        '状态': 'Status',
        '00:00:00 后成熟': 'Ready in 00:00:00',
        '0/0天': '0/0 Days',
        '可采摘 0 桃花果': 'Harvestable 0 Peach Fruit',
        '购买成功': 'Purchase successful',
        '兑换比例异常': 'Invalid exchange rate',
        '请输入兑换数量': 'Please enter the exchange amount',
        '兑换数量不符合比例': 'Exchange amount does not match the ratio',
        '桃花果不足': 'Not enough Peach Fruit',
        '兑换成功': 'Exchange successful',
        '我的桃花果 : {count}': 'My Peach Fruit : {count}',
        '手续费 : {fee}%': 'Fee : {fee}%',
        '总计 : {count}灵石': 'Total : {count} Fairy Stone',
        '{count}桃花果≈1灵石': '{count} Peach Fruit ≈ 1 Fairy Stone',
        '{count}桃花果': '{count} Peach Fruit',
        '<bold>是否购买价值<color=#FF0084>{total}USDT</color>{name}种子</bold>': '<bold>Purchase <color=#FF0084>{total} USDT</color> worth of {name} seeds?</bold>',
        '春启灵壤，万物生香，全新种植平台现已开放，从灵苗初绽到枝繁叶茂，全程可视化成长，沉浸式体验国风仙侠种植乐趣。': 'Spring awakens the blessed soil and all things bloom. The new planting platform is now open, letting you experience a fully visible growth journey from sprout to lush branches in an immersive oriental fantasy farming world.',
        '今日已签到': 'Checked in today',
        '今日未签到': 'Not checked in today',
        '今日徒步未达标': 'Today walk target not reached',
        '已连续签到{days}天': 'Checked in for {days} consecutive days',
        '今日徒步{stepCount}/{signSteps}km': 'Walk today {stepCount}/{signSteps} km',
        '已签到': 'Checked in',
        '签到': 'Check in',
        '签到成功': 'Check-in successful',
        '今日已签到，无法重复签到': 'Already checked in today',
        '待浇水': 'Need Watering',
        '成长中': 'Growing',
        '待采摘': 'Ready to Harvest',
        '枯萎待铲除': 'Withered',
        '{ripeDay}/{cycle}天': '{ripeDay}/{cycle} days',
        '可采摘{count}桃花果': 'Harvestable {count} peaches',
        '{time}后成熟': 'Ready in {time}',
        '土地状态数据异常': 'Invalid land state data',
        '浇水成功': 'Watering successful',
        '采摘成功': 'Harvest successful',
        '铲除成功': 'Clear successful',
        '返回': 'Back',
        '灵泉水明细': 'Spring Water Details',
        '桃花果明细': 'Peach Fruit Details',
        '{ripeYield}/{countYield}桃花果': '{ripeYield}/{countYield} Peach Fruit',
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
