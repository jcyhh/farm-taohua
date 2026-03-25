import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
import { Api, SeedItem } from '../Config/Api';
import { ShopGoods, GoodsData } from '../Prefab/ShopGoods';
import { Popup } from '../Common/Popup';
import { PopupBuy } from './PopupBuy';

const { ccclass, property } = _decorator;

@ccclass('PopupShop')
export class PopupShop extends Component {
    @property({ type: Prefab, tooltip: '商品预设体' })
    goodsPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: '商品列表父节点' })
    contentNode: Node | null = null;

    @property({ type: Node, tooltip: '购买弹窗节点' })
    popupBuyNode: Node | null = null;

    private goodsData: GoodsData[] = [];

    async onEnable() {
        this.goodsData = await this.loadSeeds();
        this.renderGoods();
    }

    private async loadSeeds(): Promise<GoodsData[]> {
        try {
            const response = await Api.seed();
            const seedList = this.pickSeedList(response);
            return seedList.map((seed) => this.toGoodsData(seed));
        } catch (error) {
            console.error('[PopupShop] 获取种子列表失败:', error);
            return [];
        }
    }

    private renderGoods() {
        if (!this.goodsPrefab || !this.contentNode) return;

        this.contentNode.removeAllChildren();

        for (const data of this.goodsData) {
            const node = instantiate(this.goodsPrefab);
            this.contentNode.addChild(node);

            const goods = node.getComponent(ShopGoods);
            if (goods) {
                goods.setData(data, (d) => this.onGoodsBuy(d));
            }
        }
    }

    private onGoodsBuy(data: GoodsData) {
        if (!this.popupBuyNode) return;

        const buyComp = this.popupBuyNode.getComponent(PopupBuy);
        const popupComp = this.popupBuyNode.getComponent(Popup);

        const price = data.priceValue || 0;
        buyComp?.setData(data.seedId, data.name, price);
        popupComp?.open();
    }

    private pickSeedList(response: SeedItem[] | { seed?: SeedItem[]; data?: SeedItem[]; list?: SeedItem[] }): SeedItem[] {
        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response.seed)) {
            return response.seed;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (Array.isArray(response.list)) {
            return response.list;
        }

        return [];
    }

    private toGoodsData(seed: SeedItem): GoodsData {
        const name = seed.seed_name || seed.name || '';
        const cycle = seed.seed_cycle ?? seed.cycle ?? seed.lifecycle ?? '';
        const priceValue = Number(seed.price ?? 0) || 0;

        return {
            seedId: Number(seed.seed_id ?? seed.id ?? 0) || 0,
            name,
            dayText: `${cycle}天`,
            priceText: `${priceValue}USDT`,
            priceValue,
            imageUrl: String(seed.seed_img ?? ''),
        };
    }
}
