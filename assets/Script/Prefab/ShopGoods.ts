import { _decorator, Component, Label, Node } from 'cc';

const { ccclass, property } = _decorator;

export interface GoodsData {
    name: string;
    lifecycle: string;
    price: string;
}

@ccclass('ShopGoods')
export class ShopGoods extends Component {
    @property({ type: Label, tooltip: '商品名称' })
    nameLabel: Label | null = null;

    @property({ type: Label, tooltip: '生命周期' })
    lifecycleLabel: Label | null = null;

    @property({ type: Label, tooltip: '价格' })
    priceLabel: Label | null = null;

    @property({ type: Node, tooltip: '购买按钮' })
    buyBtn: Node | null = null;

    private _data: GoodsData | null = null;
    private _onBuy: ((data: GoodsData) => void) | null = null;

    setData(data: GoodsData, onBuy?: (data: GoodsData) => void) {
        this._data = data;
        this._onBuy = onBuy ?? null;

        if (this.nameLabel) this.nameLabel.string = data.name;
        if (this.lifecycleLabel) this.lifecycleLabel.string = data.lifecycle;
        if (this.priceLabel) this.priceLabel.string = data.price;
    }

    onLoad() {
        this.buyBtn?.on(Node.EventType.TOUCH_END, this.onBuyClick, this);
    }

    onDestroy() {
        this.buyBtn?.off(Node.EventType.TOUCH_END, this.onBuyClick, this);
    }

    private onBuyClick() {
        if (this._data && this._onBuy) {
            this._onBuy(this._data);
        }
    }
}
