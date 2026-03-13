import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
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

    private mockData: GoodsData[] = [
        { name: '大漠桃花树', lifecycle: '120天', price: '10USDT' },
        { name: '戈壁桃花树', lifecycle: '90天', price: '8USDT' },
        { name: '生命桃花树', lifecycle: '60天', price: '5USDT' },
        { name: '觉醒桃花树', lifecycle: '180天', price: '15USDT' },
        { name: '仙境桃花树', lifecycle: '365天', price: '30USDT' },
        { name: '永恒桃花树', lifecycle: '999天', price: '50USDT' },
    ];

    onEnable() {
        this.renderGoods();
    }

    private renderGoods() {
        if (!this.goodsPrefab || !this.contentNode) return;

        this.contentNode.removeAllChildren();

        for (const data of this.mockData) {
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

        const price = parseInt(data.price) || 0;
        buyComp?.setData(data.name, price);
        popupComp?.open();
    }
}
