import { _decorator, Component, Label } from 'cc';
import { Api, SignInfo } from '../Config/Api';
const { ccclass } = _decorator;

@ccclass('PopupRule')
export class PopupRule extends Component {
    private ruleLabel: Label | null = null;

    onLoad() {
        this.ruleLabel = this.node.getComponentInChildren(Label);
    }

    async onEnable() {
        try {
            const signInfo = await Api.signInfo();
            this.renderRule(signInfo);
        } catch (error) {
            console.error('[PopupRule] 获取签到规则失败:', error);
        }
    }

    private renderRule(signInfo: SignInfo) {
        if (!this.ruleLabel) return;

        const giftCycle = Number(signInfo?.gift_cycle ?? 0) || 0;
        const maxGiftNum = Number(signInfo?.max_gift_num ?? 0) || 0;
        const totalGifted = Number(signInfo?.total_gifted ?? 0) || 0;

        this.ruleLabel.string =
            `每连续签到${giftCycle}天赠送一颗种子，最大可获赠${maxGiftNum}颗种子，当前已获赠${totalGifted}/${maxGiftNum}`;
    }
}

