import { _decorator, Component, Label, Node } from 'cc';
import { Api, UserProfile } from '../Config/Api';
import { formatAmount } from '../Utils/Format';
const { ccclass } = _decorator;

@ccclass('UiHeadbar')
export class UiHeadbar extends Component {
    private static _instance: UiHeadbar | null = null;
    private static _currentUser: UserProfile | null = null;

    private userInfo: UserProfile | null = null;
    private fruitLabel: Label | null = null;
    private springWaterLabel: Label | null = null;
    private fairyStoneLabel: Label | null = null;

    onLoad() {
        UiHeadbar._instance = this;
        this.fruitLabel = this.getLabelByPath('asset/assetPeach/Label');
        this.springWaterLabel = this.getLabelByPath('asset/assetHolyWater/Label');
        this.fairyStoneLabel = this.getLabelByPath('asset/assetStone/Label');
    }

    onDestroy() {
        if (UiHeadbar._instance === this) {
            UiHeadbar._instance = null;
        }
    }

    async start() {
        await UiHeadbar.refreshUserInfo();
    }

    static get currentUser(): UserProfile | null {
        return this._currentUser;
    }

    static async refreshUserInfo(): Promise<UserProfile | null> {
        try {
            const userInfo = await Api.userMy();
            this._currentUser = userInfo;
            this._instance?.applyUserInfo(userInfo);
            console.log('[UiHeadbar] 用户信息:', userInfo);
            return userInfo;
        } catch (error) {
            this._currentUser = null;
            this._instance?.applyUserInfo(null);
            console.error('[UiHeadbar] 获取用户信息失败:', error);
            return null;
        }
    }

    private applyUserInfo(userInfo: UserProfile | null) {
        this.userInfo = userInfo;
        this.renderBalances();
    }

    private renderBalances() {
        if (this.fruitLabel) {
            this.fruitLabel.string = formatAmount(this.userInfo?.balance_fruit);
        }
        if (this.springWaterLabel) {
            this.springWaterLabel.string = formatAmount(this.userInfo?.balance_spring_water);
        }
        if (this.fairyStoneLabel) {
            this.fairyStoneLabel.string = formatAmount(this.userInfo?.balance_fairy_stone);
        }
    }

    private getLabelByPath(path: string): Label | null {
        const target = this.getNodeByPath(path);
        return target?.getComponent(Label) ?? null;
    }

    private getNodeByPath(path: string): Node | null {
        const names = path.split('/').filter(Boolean);
        let current: Node | null = this.node;

        for (const name of names) {
            current = current?.getChildByName(name) ?? null;
            if (!current) {
                console.warn(`[UiHeadbar] 未找到节点路径: ${path}`);
                return null;
            }
        }

        return current;
    }
}

