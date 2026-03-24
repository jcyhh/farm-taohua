import { _decorator, Component, Node, RichText } from 'cc';
import { Api, BuySeedParams } from '../Config/Api';
import { Toast } from '../Common/Toast';
import { Popup } from '../Common/Popup';
import { Count } from '../Prefab/Count';
import { AudioManager } from '../Manager/AudioManager';
import { UiHeadbar } from './UiHeadbar';

const { ccclass, property } = _decorator;

type PayType = 'token' | 'stone';

@ccclass('PopupBuy')
export class PopupBuy extends Component {
    @property({ type: RichText, tooltip: '提示富文本' })
    tipText: RichText | null = null;

    @property({ type: Count, tooltip: '数量组件' })
    count: Count | null = null;

    private goodsName = '';
    private seedId = 0;
    private unitPrice = 0;
    private radioToken: Node | null = null;
    private radioStone: Node | null = null;
    private selectedPayType: PayType = 'stone';
    private radioClickNodes: Node[] = [];

    onLoad() {
        this.radioToken = this.node.getChildByPath('content/radioBg/token');
        this.radioStone = this.node.getChildByPath('content/radioBg/stone');

        this.bindRadioNode(this.radioToken, this.onSelectToken);
        this.bindRadioNode(this.radioStone, this.onSelectStone);
        this.updateRadioState();
    }

    setData(seedId: number, name: string, price: number) {
        this.seedId = seedId;
        this.goodsName = name;
        this.unitPrice = price;
        this.refreshText();
    }

    onEnable() {
        if (this.count) {
            this.count.value = 1;
        }
        this.selectedPayType = 'stone';
        this.updateRadioState();
        this.refreshText();
    }

    onDestroy() {
        this.unbindRadioNode(this.radioToken, this.onSelectToken);
        this.unbindRadioNode(this.radioStone, this.onSelectStone);
    }

    onCountChanged() {
        this.refreshText();
    }

    async onConfirm() {
        const quantity = this.count?.value ?? 1;
        AudioManager.instance?.playClick();

        if (!this.seedId) {
            console.warn('[PopupBuy] 缺少 seed_id，无法购买');
            return;
        }

        const payload: BuySeedParams = {
            seed_id: this.seedId,
            buy_num: quantity,
            pay_ccy: this.selectedPayType === 'token' ? 'balance_xz' : 'balance_fairy_stone',
        };

        try {
            await Api.buySeed(payload);
            await UiHeadbar.refreshUserInfo();
            AudioManager.instance?.playGold();
            Toast.showSuccess('购买成功');
            this.node.getComponent(Popup)?.close();
        } catch (error) {
            console.error('[PopupBuy] 购买失败:', error);
        }
    }

    private onSelectToken() {
        this.selectedPayType = 'token';
        this.updateRadioState();
        AudioManager.instance?.playClick();
    }

    private onSelectStone() {
        this.selectedPayType = 'stone';
        this.updateRadioState();
        AudioManager.instance?.playClick();
    }

    private refreshText() {
        if (!this.tipText) return;
        const total = this.unitPrice * (this.count?.value ?? 1);
        this.tipText.string =
            `<bold>是否购买价值<color=#FF0084>${total}USDT</color>${this.goodsName}种子</bold>`;
    }

    private updateRadioState() {
        this.setRadioNodeState(this.radioToken, this.selectedPayType === 'token');
        this.setRadioNodeState(this.radioStone, this.selectedPayType === 'stone');
    }

    private setRadioNodeState(target: Node | null, selected: boolean) {
        if (!target) return;

        const radioDef = target.getChildByName('radioDef');
        const radioAct = target.getChildByName('radioAct');

        if (radioDef) {
            radioDef.active = !selected;
        }
        if (radioAct) {
            radioAct.active = selected;
        }
    }

    private bindRadioNode(target: Node | null, handler: () => void) {
        if (!target) return;

        target.on(Node.EventType.TOUCH_END, handler, this);
        this.radioClickNodes.push(target);

        for (const child of target.children) {
            this.bindRadioNode(child, handler);
        }
    }

    private unbindRadioNode(target: Node | null, handler: () => void) {
        if (!target) return;

        target.off(Node.EventType.TOUCH_END, handler, this);

        for (const child of target.children) {
            this.unbindRadioNode(child, handler);
        }
    }
}
