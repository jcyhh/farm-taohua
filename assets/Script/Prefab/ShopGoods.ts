import { _decorator, Component, Label, Node, Sprite } from 'cc';
import { t } from '../Config/I18n';
import { RemoteSpriteCache } from '../Utils/RemoteSpriteCache';

const { ccclass, property } = _decorator;

export interface GoodsData {
    seedId: number;
    name: string;
    dayText: string;
    stockText: string;
    priceText: string;
    priceValue: number;
    imageUrl: string;
}

@ccclass('ShopGoods')
export class ShopGoods extends Component {
    private static readonly LAND_NAME_KEYS = ['沙土地', '褐土地', '金土地', '红土地', '黑土地'];

    @property({ type: Label, tooltip: '商品名称' })
    nameLabel: Label | null = null;

    @property({ type: Sprite, tooltip: '商品图片' })
    goodsSprite: Sprite | null = null;

    @property({ type: Label, tooltip: '天数文本' })
    dayLabel: Label | null = null;

    @property({ type: Label, tooltip: '库存文本' })
    stockLabel: Label | null = null;

    @property({ type: Label, tooltip: '土地文本' })
    landLabel: Label | null = null;

    @property({ type: Node, tooltip: '购买按钮' })
    buyBtn: Node | null = null;

    @property({ type: Label, tooltip: '购买按钮价格文本' })
    buyBtnLabel: Label | null = null;

    private _data: GoodsData | null = null;
    private _onBuy: ((data: GoodsData) => void) | null = null;

    onLoad() {
        this.nameLabel = this.nameLabel ?? this.node.getChildByName('name')?.getComponent(Label) ?? null;
        this.goodsSprite = this.goodsSprite ?? this.node.getChildByPath('img/goods')?.getComponent(Sprite) ?? null;
        this.dayLabel = this.dayLabel ?? this.node.getChildByName('day')?.getComponent(Label) ?? null;
        this.stockLabel = this.stockLabel ?? this.node.getChildByName('stock')?.getComponent(Label) ?? null;
        this.landLabel = this.landLabel ?? this.node.getChildByName('land')?.getComponent(Label) ?? null;
        this.buyBtn = this.buyBtn ?? this.node.getChildByName('btn') ?? null;
        this.buyBtnLabel = this.buyBtnLabel ?? this.node.getChildByPath('btn/Label')?.getComponent(Label) ?? null;

        this.buyBtn?.on(Node.EventType.TOUCH_END, this.onBuyClick, this);
    }

    setData(data: GoodsData, onBuy?: (data: GoodsData) => void) {
        this._data = data;
        this._onBuy = onBuy ?? null;

        if (this.nameLabel) this.nameLabel.string = data.name;
        if (this.dayLabel) this.dayLabel.string = data.dayText;
        if (this.stockLabel) this.stockLabel.string = `${t('库存')} ${data.stockText}`;
        if (this.landLabel) this.landLabel.string = this.getLandName(data.seedId);
        if (this.buyBtnLabel) this.buyBtnLabel.string = data.priceText;
        void this.loadGoodsImage(data.imageUrl);
    }

    onDestroy() {
        this.safeOff(this.buyBtn, Node.EventType.TOUCH_END, this.onBuyClick);
    }

    private onBuyClick() {
        if (this._data && this._onBuy) {
            this._onBuy(this._data);
        }
    }

    private safeOff(node: Node | null | undefined, eventType: string, callback: (...args: any[]) => void) {
        const target = node as any;
        if (!target?.isValid || !target._eventProcessor) {
            return;
        }
        target.off(eventType, callback, this);
    }

    private getLandName(seedId: number) {
        const normalizedSeedId = Number(seedId);
        const landKey = ShopGoods.LAND_NAME_KEYS[normalizedSeedId - 1] ?? ShopGoods.LAND_NAME_KEYS[0];
        return t(landKey);
    }

    private async loadGoodsImage(url: string) {
        if (!this.goodsSprite?.isValid) return;

        if (!url) {
            this.goodsSprite.spriteFrame = null;
            return;
        }

        try {
            const spriteFrame = await RemoteSpriteCache.load(url);
            if (!spriteFrame?.isValid || !this.goodsSprite?.isValid || this._data?.imageUrl !== url) return;
            this.goodsSprite.spriteFrame = spriteFrame;
        } catch (error) {
            console.error(`[ShopGoods] 加载商品图片失败: ${url}`, error);
        }
    }
}
