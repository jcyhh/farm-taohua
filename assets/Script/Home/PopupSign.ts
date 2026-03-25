import { _decorator, Component } from 'cc';
import { Api, SignInfo } from '../Config/Api';
import { Label } from 'cc';
import { Toast } from '../Common/Toast';
import { Popup } from '../Common/Popup';
import { AppBridge } from '../Utils/AppBridge';
const { ccclass } = _decorator;

@ccclass('PopupSign')
export class PopupSign extends Component {
    private signInfo: SignInfo | null = null;
    private titleLabel: Label | null = null;
    private statsLabel: Label | null = null;
    private progressLabel: Label | null = null;
    private buttonLabel: Label | null = null;

    onLoad() {
        this.titleLabel = this.node.getChildByPath('popupContent/title')?.getComponent(Label) ?? null;
        this.statsLabel = this.node.getChildByPath('popupContent/stats')?.getComponent(Label) ?? null;
        this.progressLabel = this.node.getChildByPath('popupContent/progress')?.getComponent(Label) ?? null;
        this.buttonLabel = this.node.getChildByPath('popupContent/popupBtn/Label')?.getComponent(Label) ?? null;
    }

    async onEnable() {
        try {
            this.signInfo = await Api.signInfo();
            this.renderSignInfo();
        } catch (error) {
            this.signInfo = null;
            console.error('[PopupSign] 获取签到信息失败:', error);
        }
    }

    async onConfirm() {
        if (this.signInfo?.signed_today) {
            Toast.showFail('今日已签到');
            return;
        }

        try {
            await Api.sign();
            this.signInfo = { ...(this.signInfo ?? {}), signed_today: true };
            this.renderSignInfo();
            Toast.showSuccess('签到成功');
            this.node.getComponent(Popup)?.close();
        } catch (error) {
            console.error('[PopupSign] 签到失败:', error);
        }
    }

    private renderSignInfo() {
        const signedToday = Boolean(this.signInfo?.signed_today);
        const continuousDays = Number(this.signInfo?.continuous_days ?? 0) || 0;
        const signSteps = this.signInfo?.sign_steps ?? 0;
        const stepCount = Number(AppBridge.getParam('stepCount', '0')) || 0;

        if (this.titleLabel) {
            this.titleLabel.string = signedToday ? '今日已签到' : '今日未签到';
        }
        if (this.statsLabel) {
            this.statsLabel.string = `已连续签到${continuousDays}天`;
        }
        if (this.progressLabel) {
            this.progressLabel.string = `今日徒步${stepCount}/${signSteps}km`;
        }
        if (this.buttonLabel) {
            this.buttonLabel.string = signedToday ? '已签到' : '签到';
        }
    }
}

