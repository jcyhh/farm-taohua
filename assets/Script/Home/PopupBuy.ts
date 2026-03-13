import { _decorator, Component, RichText, log } from 'cc';
import { Count } from '../Prefab/Count';
import { AudioManager } from '../Manager/AudioManager';

const { ccclass, property } = _decorator;

@ccclass('PopupBuy')
export class PopupBuy extends Component {
    @property({ type: RichText, tooltip: '提示富文本' })
    tipText: RichText | null = null;

    @property({ type: Count, tooltip: '数量组件' })
    count: Count | null = null;

    private goodsName = '';
    private unitPrice = 0;

    setData(name: string, price: number) {
        this.goodsName = name;
        this.unitPrice = price;
        this.refreshText();
    }

    onEnable() {
        if (this.count) {
            this.count.value = 1;
        }
        this.refreshText();
    }

    onCountChanged() {
        this.refreshText();
    }

    onConfirm() {
        const quantity = this.count?.value ?? 1;
        const total = this.unitPrice * quantity;
        log(`确认购买: ${this.goodsName} x${quantity}, 总价: ${total}USDT`);
        AudioManager.instance?.playClick();
    }

    private refreshText() {
        if (!this.tipText) return;
        const total = this.unitPrice * (this.count?.value ?? 1);
        this.tipText.string =
            `<bold>是否购买价值<color=#FF0084>${total}USDT</color>${this.goodsName}种子</bold>`;
    }
}
