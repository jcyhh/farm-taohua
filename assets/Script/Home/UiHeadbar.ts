import { _decorator, Component, Label, Node, Sprite, SpriteFrame, tween, Vec3 } from 'cc';
import { Api, UserProfile } from '../Config/Api';
import { formatAmount } from '../Utils/Format';
import { AppBridge } from '../Utils/AppBridge';
const { ccclass } = _decorator;

@ccclass('UiHeadbar')
export class UiHeadbar extends Component {
    private static _instance: UiHeadbar | null = null;
    private static _currentUser: UserProfile | null = null;

    private userInfo: UserProfile | null = null;
    private fruitLabel: Label | null = null;
    private fruitIcon: Node | null = null;
    private fruitIconSprite: Sprite | null = null;
    private springWaterLabel: Label | null = null;
    private fairyStoneLabel: Label | null = null;
    private usdtLabel: Label | null = null;
    private fruitIconScale = new Vec3(1, 1, 1);

    onLoad() {
        UiHeadbar._instance = this;
        this.fruitLabel = this.getLabelByPaths([
            'asset/assetPeach/Label',
        ]);
        this.fruitIcon = this.getNodeByPaths([
            'asset/assetPeach/icon',
        ]);
        this.fruitIconSprite = this.fruitIcon?.getComponent(Sprite) ?? null;
        if (this.fruitIcon) {
            this.fruitIconScale.set(this.fruitIcon.scale);
        }
        this.springWaterLabel = this.getLabelByPaths([
            'asset/assetHolyWater/Label',
        ]);
        this.fairyStoneLabel = this.getLabelByPaths([
            'asset/assetStone/Label',
            'asset-001/assetStone/Label',
        ]);
        this.usdtLabel = this.getLabelByPaths([
            'asset-001/assetUsdt/Label',
            'asset/assetUsdt/Label',
        ]);
    }

    onDestroy() {
        if (UiHeadbar._instance === this) {
            UiHeadbar._instance = null;
        }
    }

    async start() {
        await UiHeadbar.refreshUserInfo();
    }

    onQuit() {
        AppBridge.postMessage('navBack', '')
    }

    static get currentUser(): UserProfile | null {
        return this._currentUser;
    }

    static getPeachIconWorldPosition(out: Vec3 = new Vec3()) {
        const iconNode = this._instance?.fruitIcon;
        if (!iconNode?.isValid) {
            return null;
        }
        return iconNode.getWorldPosition(out);
    }

    static getEffectHostNode(): Node | null {
        return this._instance?.node?.isValid ? this._instance.node : null;
    }

    static getPeachIconSpriteFrame(): SpriteFrame | null {
        return this._instance?.fruitIconSprite?.spriteFrame ?? null;
    }

    static playPeachIconBounce() {
        this._instance?.playFruitIconBounce();
    }

    static async refreshUserInfo(): Promise<UserProfile | null> {
        try {
            const userInfo = await Api.userMy();
            this._currentUser = userInfo;
            this._instance?.applyUserInfo(userInfo);
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
        if (this.usdtLabel) {
            this.usdtLabel.string = formatAmount(this.userInfo?.balance_usdt);
        }
    }

    private getLabelByPaths(paths: string[]): Label | null {
        const target = this.getNodeByPaths(paths);
        return target?.getComponent(Label) ?? null;
    }

    private getNodeByPaths(paths: string[]): Node | null {
        for (const path of paths) {
            const target = this.getNodeByPath(path, false);
            if (target) {
                return target;
            }
        }
        if (paths.length > 0) {
            console.warn(`[UiHeadbar] 未找到任一节点路径: ${paths.join(' | ')}`);
        }
        return null;
    }

    private getNodeByPath(path: string, logMissing = true): Node | null {
        const names = path.split('/').filter(Boolean);
        let current: Node | null = this.node;

        for (const name of names) {
            current = current?.getChildByName(name) ?? null;
            if (!current) {
                if (logMissing) {
                    console.warn(`[UiHeadbar] 未找到节点路径: ${path}`);
                }
                return null;
            }
        }

        return current;
    }

    private playFruitIconBounce() {
        if (!this.fruitIcon?.isValid) return;

        tween(this.fruitIcon).stop();
        this.fruitIcon.setScale(this.fruitIconScale);
        tween(this.fruitIcon)
            .to(0.08, { scale: new Vec3(this.fruitIconScale.x * 1.14, this.fruitIconScale.y * 1.14, this.fruitIconScale.z) }, { easing: 'quadOut' })
            .to(0.1, { scale: this.fruitIconScale }, { easing: 'quadInOut' })
            .start();
    }
}

