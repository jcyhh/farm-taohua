import { _decorator, assetManager, Button, Component, ImageAsset, instantiate, Label, Node, Sprite, SpriteFrame, Texture2D, tween, Vec3 } from 'cc';
import { Api, MySeedItem, UserProfile } from '../Config/Api';
import { formatAmount } from '../Utils/Format';
import { UiHeadbar } from './UiHeadbar';

const { ccclass, property } = _decorator;

@ccclass('PopupBackpack')
export class PopupBackpack extends Component {
    @property({ type: Button, tooltip: '种子选项卡按钮' })
    tabSeedBtn: Button | null = null;

    @property({ type: Button, tooltip: '果实选项卡按钮' })
    tabFruitBtn: Button | null = null;

    @property({ type: Node, tooltip: '种子内容节点' })
    seedContent: Node | null = null;

    @property({ type: Node, tooltip: '果实内容节点' })
    fruitContent: Node | null = null;

    @property({ tooltip: '切换动画时长(秒)' })
    duration = 0.25;

    private isTweening = false;
    private exchangeConfig: Record<string, any> | null = null;
    private seedListRoot: Node | null = null;
    private seedItemTemplate: Node | null = null;
    private fruitItemTemplate: Node | null = null;
    private popup2CoinLabel: Label | null = null;
    private static readonly imageCache = new Map<string, SpriteFrame>();

    onLoad() {
        this.popup2CoinLabel = this.fruitContent?.getChildByPath('popup2/coin')?.getComponent(Label) ?? null;
        this.fruitItemTemplate = this.fruitContent?.getChildByName('seed') ?? null;
        if (this.fruitItemTemplate) {
            this.fruitItemTemplate.active = false;
        }
        this.seedListRoot =
            this.seedContent?.getChildByPath('list/view/content')
            ?? this.seedContent?.getChildByName('list')
            ?? this.seedContent;
        this.seedItemTemplate = this.seedListRoot?.getChildByName('seed') ?? this.fruitItemTemplate;
        if (this.seedItemTemplate && this.seedItemTemplate.parent === this.seedListRoot) {
            this.seedItemTemplate.active = false;
        }
        this.switchTab('seed', false);
    }

    onEnable() {
        void this.loadExchangeConfig();
    }

    onTabSeedClick() {
        this.switchTab('seed', true);
    }

    onTabFruitClick() {
        this.switchTab('fruit', true);
    }

    private switchTab(tab: 'seed' | 'fruit', animate: boolean) {
        if (this.isTweening) return;
        const isSeed = tab === 'seed';

        if (isSeed) {
            void this.loadSeedList();
        } else {
            void this.loadFruitInfo();
        }

        if (this.tabSeedBtn) this.tabSeedBtn.interactable = !isSeed;
        if (this.tabFruitBtn) this.tabFruitBtn.interactable = isSeed;

        const seedX = isSeed ? 0 : -510;
        const fruitX = isSeed ? 255 : -255;

        if (!animate) {
            this.setPosX(this.seedContent, seedX);
            this.setPosX(this.fruitContent, fruitX);
            return;
        }

        this.isTweening = true;
        this.tweenX(this.seedContent, seedX);
        this.tweenX(this.fruitContent, fruitX, () => {
            this.isTweening = false;
        });
    }

    private setPosX(node: Node | null, x: number) {
        if (!node) return;
        const pos = node.position;
        node.setPosition(x, pos.y, pos.z);
    }

    private tweenX(node: Node | null, x: number, onComplete?: () => void) {
        if (!node) return;
        const pos = node.position;
        tween(node)
            .to(this.duration, { position: new Vec3(x, pos.y, pos.z) }, { easing: 'cubicOut' })
            .call(() => { onComplete?.(); })
            .start();
    }

    private async loadSeedList() {
        try {
            const response = await Api.mySeed();
            const list = this.pickMySeedList(response);
            this.renderSeedList(list);
        } catch (error) {
            console.error('[PopupBackpack] 获取种子列表失败:', error);
        }
    }

    private async loadExchangeConfig() {
        try {
            this.exchangeConfig = await Api.exchangeConfig();
            this.renderExchangeConfig();
        } catch (error) {
            this.exchangeConfig = null;
            console.error('[PopupBackpack] 获取兑换配置失败:', error);
        }
    }

    private async loadFruitInfo() {
        try {
            const userInfo = await UiHeadbar.refreshUserInfo();
            if (!userInfo) return;
            this.renderFruitInfo(userInfo);
        } catch (error) {
            console.error('[PopupBackpack] 获取果实信息失败:', error);
        }
    }

    private pickMySeedList(response: MySeedItem[] | { data?: MySeedItem[]; list?: MySeedItem[] }): MySeedItem[] {
        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response.list)) {
            return response.list;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        return [];
    }

    private renderSeedList(list: MySeedItem[]) {
        if (!this.seedListRoot || !this.seedItemTemplate) return;

        for (const child of [...this.seedListRoot.children]) {
            if (child !== this.seedItemTemplate) {
                child.destroy();
            }
        }

        for (const item of list) {
            const node = instantiate(this.seedItemTemplate);
            node.active = true;
            this.seedListRoot.addChild(node);
            this.fillSeedItem(node, item);
        }
    }

    private renderFruitInfo(userInfo: UserProfile) {
        if (!this.fruitContent || !this.fruitItemTemplate) return;

        this.fruitItemTemplate.active = true;
        const countLabel = this.fruitItemTemplate.getChildByName('count')?.getComponent(Label) ?? null;
        if (countLabel) {
            countLabel.string = formatAmount(userInfo.balance_fruit);
        }
    }

    private renderExchangeConfig() {
        if (!this.popup2CoinLabel) return;
        this.popup2CoinLabel.string = `${formatAmount(this.exchangeConfig?.rate ?? 0)}桃花果`;
    }

    private fillSeedItem(node: Node, item: MySeedItem) {
        const nameLabel = node.getChildByName('name')?.getComponent(Label) ?? null;
        const countLabel = node.getChildByName('count')?.getComponent(Label) ?? null;
        const goodsSprite = node.getChildByPath('img/goods')?.getComponent(Sprite) ?? null;

        if (nameLabel) {
            nameLabel.string = item.seed?.seed_name || '';
        }

        if (countLabel) {
            countLabel.string = String(item.amount ?? 0);
        }

        void this.loadRemoteSprite(goodsSprite, String(item.seed?.seed_img ?? ''));
    }

    private async loadRemoteSprite(sprite: Sprite | null, url: string) {
        if (!sprite) return;

        if (!url) {
            sprite.spriteFrame = null;
            return;
        }

        const cachedFrame = PopupBackpack.imageCache.get(url);
        if (cachedFrame) {
            sprite.spriteFrame = cachedFrame;
            return;
        }

        try {
            const imageAsset = await this.loadRemoteImage(url);
            if (!imageAsset) return;

            const texture = new Texture2D();
            texture.image = imageAsset;

            const spriteFrame = new SpriteFrame();
            spriteFrame.texture = texture;
            PopupBackpack.imageCache.set(url, spriteFrame);
            sprite.spriteFrame = spriteFrame;
        } catch (error) {
            console.error(`[PopupBackpack] 加载种子图片失败: ${url}`, error);
        }
    }

    private loadRemoteImage(url: string): Promise<ImageAsset | null> {
        return new Promise((resolve, reject) => {
            assetManager.loadRemote<ImageAsset>(url, (error, imageAsset) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(imageAsset ?? null);
            });
        });
    }
}
