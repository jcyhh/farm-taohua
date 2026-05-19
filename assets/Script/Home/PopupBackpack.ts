import { _decorator, Button, Component, instantiate, Label, Node, Prefab, resources, Sprite, SpriteFrame, tween, Vec3 } from 'cc';
import { Api, MySeedItem, UserProfile } from '../Config/Api';
import { t } from '../Config/I18n';
import { formatAmount } from '../Utils/Format';
import { RemoteSpriteCache } from '../Utils/RemoteSpriteCache';
import { UiHeadbar } from './UiHeadbar';

const { ccclass, property } = _decorator;

interface BoostCardItem {
    id?: number;
    card_type_id?: number;
    name?: string;
    land_level?: number | string;
    boost_hours?: number | string;
    amount?: number | string;
    [key: string]: any;
}

@ccclass('PopupBackpack')
export class PopupBackpack extends Component {
    private static readonly CARD_ICON_PATHS: Record<number, string> = {
        5: 'card4/spriteFrame',
        4: 'card4/spriteFrame',
        3: 'card3/spriteFrame',
        2: 'card2/spriteFrame',
        1: 'card/spriteFrame',
        0: 'card/spriteFrame',
    };
    private static readonly CARD_LAND_NAME_KEYS: Record<number, string> = {
        0: '通用',
        1: '沙土地',
        2: '褐土地',
        3: '金土地',
        4: '红土地',
        5: '黑土地',
    };
    private static readonly iconCache = new Map<string, SpriteFrame | null>();

    @property({ type: Button, tooltip: '种子选项卡按钮' })
    tabSeedBtn: Button | null = null;

    @property({ type: Button, tooltip: '果实选项卡按钮' })
    tabFruitBtn: Button | null = null;

    @property({ type: Button, tooltip: '卡片选项卡按钮' })
    tabCardBtn: Button | null = null;

    @property({ type: Node, tooltip: '种子内容节点' })
    seedContent: Node | null = null;

    @property({ type: Node, tooltip: '果实内容节点' })
    fruitContent: Node | null = null;

    @property({ type: Node, tooltip: '卡片内容节点' })
    cardContent: Node | null = null;

    @property({ type: Prefab, tooltip: '背包加速卡预设体' })
    bagCardPrefab: Prefab | null = null;

    @property({ tooltip: '切换动画时长(秒)' })
    duration = 0.25;

    private isTweening = false;
    private exchangeConfig: Record<string, any> | null = null;
    private seedListRoot: Node | null = null;
    private seedItemTemplate: Node | null = null;
    private fruitItemTemplate: Node | null = null;
    private cardListRoot: Node | null = null;
    private cardItemTemplate: Node | null = null;
    private popup2CoinLabel: Label | null = null;
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
        this.cardListRoot =
            this.cardContent?.getChildByPath('list/view/content')
            ?? this.cardContent?.getChildByName('list')
            ?? this.cardContent;
        this.cardItemTemplate = this.cardListRoot?.getChildByName('seed') ?? null;
        if (this.seedItemTemplate && this.seedItemTemplate.parent === this.seedListRoot) {
            this.seedItemTemplate.active = false;
        }
        if (this.cardItemTemplate && this.cardItemTemplate.parent === this.cardListRoot) {
            this.cardItemTemplate.active = false;
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

    onTabCardClick() {
        this.switchTab('card', true);
    }

    private switchTab(tab: 'seed' | 'fruit' | 'card', animate: boolean) {
        if (this.isTweening) return;
        const isSeed = tab === 'seed';
        const isFruit = tab === 'fruit';
        const isCard = tab === 'card';

        if (isSeed) {
            void this.loadSeedList();
        } else if (isFruit) {
            void this.loadFruitInfo();
        } else {
            void this.loadCardList();
        }

        if (this.tabSeedBtn) this.tabSeedBtn.interactable = !isSeed;
        if (this.tabFruitBtn) this.tabFruitBtn.interactable = !isFruit;
        if (this.tabCardBtn) this.tabCardBtn.interactable = !isCard;

        if (this.seedContent) this.seedContent.active = true;
        if (this.fruitContent) this.fruitContent.active = true;
        if (this.cardContent) this.cardContent.active = true;

        const positions = isSeed
            ? { seed: 0, fruit: 255, card: 1020 }
            : isFruit
                ? { seed: -510, fruit: -255, card: 510 }
                : { seed: -1020, fruit: -765, card: 0 };

        if (!animate) {
            this.setPosX(this.seedContent, positions.seed);
            this.setPosX(this.fruitContent, positions.fruit);
            this.setPosX(this.cardContent, positions.card);
            return;
        }

        this.isTweening = true;
        this.tweenX(this.seedContent, positions.seed);
        this.tweenX(this.fruitContent, positions.fruit);
        this.tweenX(this.cardContent, positions.card, () => {
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

    private async loadCardList() {
        try {
            const response = await Api.landBoostCards();
            const list = this.pickBoostCardList(response);
            this.renderCardList(list);
        } catch (error) {
            console.error('[PopupBackpack] 获取卡片列表失败:', error);
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

    private pickBoostCardList(response: Record<string, any> | null): BoostCardItem[] {
        if (!response) {
            return [];
        }

        if (Array.isArray(response.list)) {
            return response.list;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (Array.isArray(response.data?.list)) {
            return response.data.list;
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

    private renderCardList(list: BoostCardItem[]) {
        if (!this.cardListRoot || !this.bagCardPrefab) return;

        for (const child of [...this.cardListRoot.children]) {
            if (child !== this.cardItemTemplate) {
                child.destroy();
            }
        }

        for (const item of list) {
            const node = instantiate(this.bagCardPrefab);
            node.active = true;
            this.cardListRoot.addChild(node);
            void this.fillCardItem(node, item);
        }
    }

    private renderExchangeConfig() {
        if (!this.popup2CoinLabel) return;
        this.popup2CoinLabel.string = t('{count}桃花果', { count: formatAmount(this.exchangeConfig?.rate ?? 0) });
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

    private async fillCardItem(node: Node, item: BoostCardItem) {
        const nameLabel = node.getChildByName('name')?.getComponent(Label) ?? null;
        const countLabel = node.getChildByName('count')?.getComponent(Label)
            ?? node.getChildByPath('number/count')?.getComponent(Label)
            ?? null;
        const cardSprite = node.getChildByPath('img/goods')?.getComponent(Sprite)
            ?? node.getChildByPath('img/card')?.getComponent(Sprite)
            ?? null;

        if (nameLabel) {
            nameLabel.string = String(item.name ?? '');
        }

        if (countLabel) {
            countLabel.string = this.getCardLandName(item);
        }

        if (cardSprite) {
            cardSprite.spriteFrame = await this.loadCardIcon(Number(item.land_level ?? 0));
        }
    }

    private async loadCardIcon(landLevel: number) {
        const normalizedLandLevel = Number.isFinite(landLevel) ? landLevel : 0;
        const resourcePath = PopupBackpack.CARD_ICON_PATHS[normalizedLandLevel] ?? PopupBackpack.CARD_ICON_PATHS[0];
        const cached = PopupBackpack.iconCache.get(resourcePath);
        if (cached !== undefined) {
            return cached;
        }

        const spriteFrame = await new Promise<SpriteFrame | null>((resolve) => {
            resources.load(resourcePath, SpriteFrame, (error, asset) => {
                if (error) {
                    resolve(null);
                    return;
                }
                resolve(asset ?? null);
            });
        });

        PopupBackpack.iconCache.set(resourcePath, spriteFrame);
        return spriteFrame;
    }

    private getCardLandName(item: BoostCardItem) {
        const landLevel = Number(item.land_level ?? 0);
        const landNameKey = PopupBackpack.CARD_LAND_NAME_KEYS[landLevel];
        if (landNameKey) {
            return t(landNameKey);
        }

        return String(item.name ?? '').replace(/加速卡$/, '').trim();
    }

    private async loadRemoteSprite(sprite: Sprite | null, url: string) {
        if (!sprite?.isValid) return;

        if (!url) {
            sprite.spriteFrame = null;
            return;
        }

        try {
            const spriteFrame = await RemoteSpriteCache.load(url);
            if (!spriteFrame?.isValid || !sprite?.isValid) return;
            sprite.spriteFrame = spriteFrame;
        } catch (error) {
            console.error(`[PopupBackpack] 加载种子图片失败: ${url}`, error);
        }
    }
}
