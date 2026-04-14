import { Storage } from '../Utils/Storage';

const FIGHT_RESULT_STORAGE_KEY = 'fight-result-store';

export interface FightResultData {
    game_id?: number | string;
    winner?: number | string;
    my_income?: number | string;
    player1_income?: number | string;
    player2_income?: number | string;
    balance_fairy_stone?: number | string;
    selected_box_name?: string;
    player1?: Record<string, any> | null;
    player2?: Record<string, any> | null;
    raw?: Record<string, any> | null;
    [key: string]: any;
}

export class FightResultStore {
    private static currentResult: FightResultData | null = null;

    static saveFromResponse(response: any, extraData: Partial<FightResultData> = {}) {
        const result = this.normalizeResponse(response, extraData);
        this.currentResult = result;
        Storage.setObject(FIGHT_RESULT_STORAGE_KEY, result);
        console.log('[FightResultStore] 已缓存对局结果:', result);
        return result;
    }

    static getCurrent() {
        if (this.currentResult) {
            return this.currentResult;
        }
        this.currentResult = Storage.getObject<FightResultData>(FIGHT_RESULT_STORAGE_KEY, null);
        return this.currentResult;
    }

    static clear() {
        this.currentResult = null;
        Storage.remove(FIGHT_RESULT_STORAGE_KEY);
    }
    private static normalizeResponse(response: any, extraData: Partial<FightResultData>): FightResultData {
        const dataLayer = this.pickObject(response?.data);
        const gameLayer = this.pickObject(response?.game);
        const nestedGameLayer = this.pickObject(dataLayer?.game);
        const sources = [response, dataLayer, gameLayer, nestedGameLayer].filter(Boolean);

        return {
            game_id: this.pickField(sources, 'game_id'),
            winner: this.pickField(sources, 'winner'),
            my_income: this.pickField(sources, 'my_income'),
            player1_income: this.pickPreferredField(sources, ['my_income', 'player1_income']),
            player2_income: this.pickField(sources, 'player2_income'),
            balance_fairy_stone: this.pickField(sources, 'balance_fairy_stone'),
            selected_box_name: extraData.selected_box_name ?? this.pickField(sources, 'selected_box_name'),
            player1: this.pickPlayerObject(sources, 'me', 'player1'),
            player2: this.pickPlayerObject(sources, 'opponent', 'player2'),
            raw: this.pickObject(response),
        };
    }

    private static pickField(sources: any[], fieldName: string) {
        for (const source of sources) {
            if (source && source[fieldName] !== undefined) {
                return source[fieldName];
            }
        }
        return undefined;
    }

    private static pickPreferredField(sources: any[], fieldNames: string[]) {
        for (const fieldName of fieldNames) {
            const value = this.pickField(sources, fieldName);
            if (value !== undefined) {
                return value;
            }
        }
        return undefined;
    }

    private static pickObject(value: any) {
        if (!value || Array.isArray(value) || typeof value !== 'object') {
            return null;
        }
        return value as Record<string, any>;
    }

    private static pickPlayerObject(sources: any[], preferredFieldName: string, fallbackFieldName: string) {
        const preferredPlayer = this.pickObject(this.pickField(sources, preferredFieldName));
        if (preferredPlayer) {
            return preferredPlayer;
        }
        return this.pickObject(this.pickField(sources, fallbackFieldName));
    }
}
