import { _decorator, assetManager, Component, ImageAsset, Label, Node, Sprite, SpriteFrame, Texture2D } from 'cc';

const { ccclass, property } = _decorator;

export interface GoodsData {
    seedId: number;
    name: string;
    dayText: string;
    priceText: string;
    priceValue: number;
    imageUrl: string;
}

@ccclass('ShopGoods')
export class ShopGoods extends Component {
    @property({ type: Label, tooltip: '商品名称' })
    nameLabel: Label | null = null;

    @property({ type: Sprite, tooltip: '商品图片' })
    goodsSprite: Sprite | null = null;

    @property({ type: Label, tooltip: '天数文本' })
    dayLabel: Label | null = null;

    @property({ type: Node, tooltip: '购买按钮' })
    buyBtn: Node | null = null;

    @property({ type: Label, tooltip: '购买按钮价格文本' })
    buyBtnLabel: Label | null = null;

    private _data: GoodsData | null = null;
    private _onBuy: ((data: GoodsData) => void) | null = null;
    private static readonly imageCache = new Map<string, SpriteFrame>();

    onLoad() {
        this.nameLabel = this.nameLabel ?? this.node.getChildByName('name')?.getComponent(Label) ?? null;
        this.goodsSprite = this.goodsSprite ?? this.node.getChildByPath('img/goods')?.getComponent(Sprite) ?? null;
        this.dayLabel = this.dayLabel ?? this.node.getChildByName('day')?.getComponent(Label) ?? null;
        this.buyBtn = this.buyBtn ?? this.node.getChildByName('btn') ?? null;
        this.buyBtnLabel = this.buyBtnLabel ?? this.node.getChildByPath('btn/Label')?.getComponent(Label) ?? null;

        this.buyBtn?.on(Node.EventType.TOUCH_END, this.onBuyClick, this);
    }

    setData(data: GoodsData, onBuy?: (data: GoodsData) => void) {
        this._data = data;
        this._onBuy = onBuy ?? null;

        if (this.nameLabel) this.nameLabel.string = data.name;
        if (this.dayLabel) this.dayLabel.string = data.dayText;
        if (this.buyBtnLabel) this.buyBtnLabel.string = data.priceText;
        void this.loadGoodsImage(data.imageUrl);
    }

    onDestroy() {
        this.buyBtn?.off(Node.EventType.TOUCH_END, this.onBuyClick, this);
    }

    private onBuyClick() {
        if (this._data && this._onBuy) {
            this._onBuy(this._data);
        }
    }

    private async loadGoodsImage(url: string) {
        if (!this.goodsSprite) return;

        if (!url) {
            this.goodsSprite.spriteFrame = null;
            return;
        }

        const cachedFrame = ShopGoods.imageCache.get(url);
        if (cachedFrame) {
            this.goodsSprite.spriteFrame = cachedFrame;
            return;
        }

        try {
            const imageAsset = await this.loadRemoteImage(url);
            if (!imageAsset) return;

            const texture = new Texture2D();
            texture.image = imageAsset;

            const spriteFrame = new SpriteFrame();
            spriteFrame.texture = texture;
            ShopGoods.imageCache.set(url, spriteFrame);
            this.goodsSprite.spriteFrame = spriteFrame;
        } catch (error) {
            console.error(`[ShopGoods] 加载商品图片失败: ${url}`, error);
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
