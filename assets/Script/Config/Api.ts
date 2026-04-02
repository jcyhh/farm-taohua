import { Request } from '../Utils/Request';

const http = Request.instance;

// ==================== 类型定义 ====================

export interface NoticeItem {
    id?: number;
    title?: string;
    content?: string;
    notice?: string;
    [key: string]: any;
}

export interface SeedItem {
    id?: number;
    name?: string;
    seed_id?: number;
    seed_name?: string;
    seed_img?: string;
    seed_cycle?: number | string;
    cycle?: number | string;
    stock?: number | string;
    price?: number | string;
    lifecycle?: string | number;
    [key: string]: any;
}

export interface MySeedItem {
    id?: number;
    amount?: number | string;
    seed?: SeedItem;
    [key: string]: any;
}

export interface MySeedParams {
    land_level?: number;
}

export interface BuySeedParams {
    seed_id: number;
    buy_num: number;
    pay_ccy: 'balance_xz' | 'balance_fairy_stone' | 'balance_usdt';
}

export interface ExchangeConfig {
    [key: string]: any;
}

export interface ExchangeParams {
    type: 'fruit_to_fs' | 'fs_to_fruit';
    amount: number;
}

export interface SignInfo {
    gift_cycle?: number | string;
    gift_amount?: number | string;
    seed_cycle?: number | string;
    gift_limit?: number | string;
    [key: string]: any;
}

/** POST /api/sign 请求体：timestamp、sign、stepCount 均来自链接（AppBridge） */
export interface SignRequestBody {
    timestamp: string;
    sign: string;
    steps: number;
}

export interface BalanceLogItem {
    id?: number;
    remark?: string;
    note?: string;
    title?: string;
    content?: string;
    amount?: number | string;
    value?: number | string;
    change_amount?: number | string;
    created_at?: string;
    create_time?: string;
    time?: string;
    [key: string]: any;
}

export interface BalanceLogParams {
    ccy: 'balance_fruit' | 'balance_spring_water';
    page_no: number;
    page_size: number;
}

export interface BalanceLogResponse {
    data?: BalanceLogItem[] | { list?: BalanceLogItem[]; logs?: BalanceLogItem[]; items?: BalanceLogItem[] };
    list?: BalanceLogItem[];
    logs?: BalanceLogItem[];
    items?: BalanceLogItem[];
    total?: number | string;
    page_no?: number | string;
    page_size?: number | string;
    [key: string]: any;
}

export interface LandInfo {
    id?: number;
    land_id?: number;
    seed_id?: number;
    seed_name?: string;
    seed_img?: string;
    grow_img?: string;
    ripe_img?: string;
    next_ripe_time?: string;
    ripe_day?: number | string;
    cycle?: number | string;
    count_yield?: number | string;
    ripe_yield?: number | string;
    this_ripe_yield?: number | string;
    status?: number | string;
    [key: string]: any;
}

export interface LandListItem {
    id?: number;
    land_id?: number;
    type?: number | string;
    level?: number | string;
    land_info?: LandInfo;
    [key: string]: any;
}

export interface LandListResponse {
    land_list?: LandListItem[];
    data?: LandListItem[] | { list?: LandListItem[]; land_list?: LandListItem[]; refresh_time?: number };
    list?: LandListItem[];
    refresh_time?: number | string;
    [key: string]: any;
}

export interface LandSowParams {
    land_id: number;
    seed_id: number;
}

export interface LandOperateParams {
    sow_detail_id: number;
}

export interface LandSowResponse {
    land_info?: LandInfo;
    data?: {
        land_info?: LandInfo;
        [key: string]: any;
    };
    [key: string]: any;
}

export interface LandDetailResponse {
    land_info?: LandInfo;
    data?: LandInfo | { land_info?: LandInfo };
    [key: string]: any;
}

export interface UserProfile {
    id?: number;
    user_id?: number;
    nickname?: string;
    username?: string;
    avatar?: string;
    balance?: string | number;
    [key: string]: any;
}

// ==================== 接口 ====================

export class Api {
    /** GET /api/users/my 获取当前登录用户信息 */
    static userMy(): Promise<UserProfile> {
        return http.get<UserProfile>('/api/users/my');
    }

    /** GET /api/users/my/balance_logs 获取资产明细列表 */
    static userBalanceLogs(params: BalanceLogParams): Promise<BalanceLogResponse> {
        return http.get('/api/users/my/balance_logs', params);
    }

    /** GET /api/notices 获取公告列表 */
    static notices(): Promise<
        NoticeItem[] | { notices?: NoticeItem[]; list?: NoticeItem[]; data?: NoticeItem[] | { list?: NoticeItem[] } }
    > {
        return http.get('/api/notices', {
            type: 2,
            page_no: 1,
            page_size: 1,
        });
    }

    /** GET /api/seed 获取种子列表 */
    static seed(): Promise<SeedItem[] | { seed?: SeedItem[]; data?: SeedItem[]; list?: SeedItem[] }> {
        return http.get('/api/seed');
    }

    /** GET /api/seed/my 获取我的种子列表 */
    static mySeed(params: MySeedParams = {}): Promise<MySeedItem[] | { data?: MySeedItem[]; list?: MySeedItem[] }> {
        return http.get('/api/seed/my', params);
    }

    /** GET /api/land/{type} 获取土地列表 */
    static landList(type: number | string): Promise<LandListResponse> {
        return http.get(`/api/land/${type}`);
    }

    /** GET /api/land/info/{land_id} 获取土地详情 */
    static landInfo(landId: number | string): Promise<LandDetailResponse> {
        return http.get(`/api/land/info/${landId}`);
    }

    /** POST /api/land/water 浇水 */
    static landWater(data: LandOperateParams): Promise<LandSowResponse> {
        return http.post('/api/land/water', data);
    }

    /** POST /api/land/pick 采摘 */
    static landPick(data: LandOperateParams): Promise<LandSowResponse> {
        return http.post('/api/land/pick', data);
    }

    /** POST /api/land/remove 铲除 */
    static landRemove(data: LandOperateParams): Promise<LandSowResponse> {
        return http.post('/api/land/remove', data);
    }

    /** POST /api/land/sow 播种 */
    static landSow(data: LandSowParams): Promise<LandSowResponse> {
        return http.post('/api/land/sow', data);
    }

    /** POST /api/seed/buy_seed 购买种子 */
    static buySeed(data: BuySeedParams): Promise<Record<string, any>> {
        return http.post('/api/seed/buy_seed', data);
    }

    /** GET /api/exchange/config 获取兑换配置 */
    static exchangeConfig(): Promise<ExchangeConfig> {
        return http.get('/api/exchange/config');
    }

    /** POST /api/exchange/fruit-to-fairy-stone 果实灵石互兑 */
    static exchangeFruitToFairyStone(data: ExchangeParams): Promise<Record<string, any>> {
        return http.post('/api/exchange/fruit-to-fairy-stone', data);
    }

    /** GET /api/sign/info 获取签到信息 */
    static signInfo(): Promise<SignInfo> {
        return http.get('/api/sign/info');
    }

    /** POST /api/sign 执行签到，body: { timestamp, sign, steps }（steps 为链接参数 stepCount 的数值） */
    static sign(data: SignRequestBody): Promise<Record<string, any>> {
        return http.post('/api/sign', data);
    }
}
