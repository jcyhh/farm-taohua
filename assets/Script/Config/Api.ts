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
    pay_ccy: 'balance_xz' | 'balance_fairy_stone';
}

export interface ExchangeConfig {
    [key: string]: any;
}

export interface ExchangeParams {
    type: 'fruit_to_fs' | 'fs_to_fruit';
    amount: number;
}

export interface SignInfo {
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

    /** POST /api/sign 执行签到 */
    static sign(): Promise<Record<string, any>> {
        return http.post('/api/sign');
    }
}
