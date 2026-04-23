import { _decorator, Component, Label } from 'cc';
import { Api, SignInfo } from '../Config/Api';
import { t } from '../Config/I18n';

const { ccclass } = _decorator;

/** 与 I18n 字典 key 完全一致（含换行） */
const SIGN_RULE_TEMPLATE =
    '桃花源正式开启内测阶段\n' +
    '现招募体验玩家 连续签到打卡{gift_cycle}天\n' +
    '送体验桃花树{gift_amount}棵 生命周期{seed_cycle}天\n' +
    '限量{gift_limit}席，已领 {gifted_count}';

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
        const giftAmount = Number(signInfo?.gift_amount ?? 0) || 0;
        const seedCycle = Number(signInfo?.seed_cycle ?? 0) || 0;
        const giftLimit = Number(signInfo?.gift_limit ?? 0) || 0;
        const giftedCount = Number(signInfo?.gifted_count ?? 0) || 0;

        this.ruleLabel.string = t(SIGN_RULE_TEMPLATE, {
            gift_cycle: giftCycle,
            gift_amount: giftAmount,
            seed_cycle: seedCycle,
            gift_limit: giftLimit,
            gifted_count: giftedCount,
        });
    }
}

