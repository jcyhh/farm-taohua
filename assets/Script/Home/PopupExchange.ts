import { _decorator, Component, Label, Node } from 'cc';
import { Api, ExchangeConfig, ExchangeParams, UserProfile } from '../Config/Api';
import { Toast } from '../Common/Toast';
import { Popup } from '../Common/Popup';
import { Count } from '../Prefab/Count';
import { UiHeadbar } from './UiHeadbar';
import { formatAmount } from '../Utils/Format';
const { ccclass } = _decorator;

@ccclass('PopupExchange')
export class PopupExchange extends Component {
    private rateLabel: Label | null = null;
    private feeLabel: Label | null = null;
    private myFruitLabel: Label | null = null;
    private count: Count | null = null;
    private totalLabel: Label | null = null;

    private exchangeConfig: ExchangeConfig | null = null;
    private userInfo: UserProfile | null = null;
    private rate = 0;
    private feeRate = 0;

    onLoad() {
        this.rateLabel = this.node.getChildByPath('content/rate')?.getComponent(Label) ?? null;
        this.feeLabel = this.node.getChildByPath('content/fee')?.getComponent(Label) ?? null;
        this.myFruitLabel = this.node.getChildByPath('content/asset/Label')?.getComponent(Label) ?? null;
        this.count = this.node.getChildByPath('content/count')?.getComponent(Count) ?? null;
        this.totalLabel = this.node.getChildByPath('content/total')?.getComponent(Label) ?? null;
    }

    async onEnable() {
        await this.refreshViewData();
    }

    onCountChanged() {
        this.renderTotal();
    }

    async onConfirm() {
        const amount = this.count?.value ?? 0;
        if (this.rate <= 0) {
            Toast.showFail('兑换比例异常');
            return;
        }
        if (amount <= 0) {
            Toast.showFail('请输入兑换数量');
            return;
        }
        if (amount % this.rate !== 0) {
            Toast.showFail('兑换数量不符合比例');
            return;
        }

        const availableFruit = Math.floor(Number(this.userInfo?.balance_fruit ?? 0));
        if (amount > availableFruit) {
            Toast.showFail('桃花果不足');
            return;
        }

        const payload: ExchangeParams = {
            type: 'fruit_to_fs',
            amount,
        };

        try {
            await Api.exchangeFruitToFairyStone(payload);
            Toast.showSuccess('兑换成功');
            this.userInfo = await UiHeadbar.refreshUserInfo();
            this.applyUserInfo();
            this.node.getComponent(Popup)?.close();
        } catch (error) {
            console.error('[PopupExchange] 兑换失败:', error);
        }
    }

    private async refreshViewData() {
        try {
            const [exchangeConfig, userInfo] = await Promise.all([
                Api.exchangeConfig(),
                UiHeadbar.refreshUserInfo(),
            ]);

            this.exchangeConfig = exchangeConfig;
            this.userInfo = userInfo;
            this.rate = Number(exchangeConfig?.rate ?? 0) || 0;
            this.feeRate = Number(exchangeConfig?.fee_rate ?? 0) || 0;

            this.applyExchangeConfig();
            this.applyUserInfo();
            this.renderTotal();
        } catch (error) {
            console.error('[PopupExchange] 初始化兑换弹窗失败:', error);
        }
    }

    private applyExchangeConfig() {
        if (this.rateLabel) {
            this.rateLabel.string = `${formatAmount(this.rate)}桃花果≈1灵石`;
        }
        if (this.feeLabel) {
            this.feeLabel.string = `手续费 : ${formatAmount(this.feeRate)}%`;
        }
    }

    private applyUserInfo() {
        const availableFruit = Number(this.userInfo?.balance_fruit ?? 0) || 0;

        if (this.myFruitLabel) {
            this.myFruitLabel.string = `我的桃花果 : ${formatAmount(availableFruit)}`;
        }

        if (this.count) {
            const step = this.rate > 0 ? this.rate : 1;

            this.count.min = 0;
            this.count.max = 99999999;
            this.count.step = step;
            this.count.defaultValue = step;
            this.count.value = this.count.defaultValue;
        }
    }

    private renderTotal() {
        if (!this.totalLabel) return;

        const amount = this.count?.value ?? 0;
        const grossTotal = this.rate > 0 ? amount / this.rate : 0;
        const total = grossTotal * (1 - this.feeRate / 100);
        this.totalLabel.string = `总计 : ${formatAmount(total)}灵石`;
    }
}

