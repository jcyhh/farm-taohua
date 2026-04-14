import { _decorator, Component, Label, Node } from 'cc';
import { Popup } from '../Common/Popup';
import { formatAmount } from '../Utils/Format';
import { TreeBattleInviteReceivedItem } from '../Config/Api';
import { t } from '../Config/I18n';
const { ccclass, property } = _decorator;

type PopupReviewHandlers = {
    onReject?: (invite: TreeBattleInviteReceivedItem | null) => Promise<boolean | void> | boolean | void;
    onAccept?: (invite: TreeBattleInviteReceivedItem | null) => Promise<boolean | void> | boolean | void;
};

@ccclass('PopupReview')
export class PopupReview extends Component {
    @property({ type: Label, tooltip: '邀请提示文本，拖拽 popupContent/message 到这里' })
    messageLabel: Label | null = null;

    @property({ type: Label, tooltip: '邀请剩余时间文本，拖拽 popupContent/time 到这里' })
    timeLabel: Label | null = null;

    private inviteData: TreeBattleInviteReceivedItem | null = null;
    private remainingSeconds = 0;
    private handlers: PopupReviewHandlers = {};

    onLoad() {
        this.messageLabel = this.messageLabel
            ?? this.findLabelByPath('popupContent/message')
            ?? null;
        this.timeLabel = this.timeLabel
            ?? this.findLabelByPath('popupContent/time')
            ?? null;
    }

    onDisable() {
        this.unschedule(this.handleCountdownTick);
    }

    showInviteReview(invite: TreeBattleInviteReceivedItem, handlers: PopupReviewHandlers = {}) {
        this.inviteData = invite;
        this.handlers = handlers;
        this.remainingSeconds = this.normalizeSeconds(invite.remaining_seconds);
        this.renderMessage();
        this.renderTime();
        this.unschedule(this.handleCountdownTick);
        this.schedule(this.handleCountdownTick, 1);

        const popup = this.node.getComponent(Popup);
        if (popup) {
            popup.open();
            return;
        }
        this.node.active = true;
    }

    async onReject() {
        const result = await this.handlers.onReject?.(this.inviteData);
        if (result === false) {
            return;
        }
        this.hide();
    }

    async onAccept() {
        const result = await this.handlers.onAccept?.(this.inviteData);
        if (result === false) {
            return;
        }
        this.hide();
    }

    hidePopup() {
        this.hide();
    }

    private readonly handleCountdownTick = () => {
        this.remainingSeconds -= 1;
        this.renderTime();
        if (this.remainingSeconds > 0) {
            return;
        }
        this.unschedule(this.handleCountdownTick);
        this.hide();
    };

    private renderMessage() {
        if (!this.messageLabel?.isValid) {
            return;
        }

        const phone = this.inviteData?.inviter_phone ?? '';
        const amount = formatAmount(this.inviteData?.amount ?? 0);
        this.messageLabel.string = t('收到“{phone}”用户的邀请\n对决宝箱价值【{amount}钻石】', {
            phone,
            amount,
        });
    }

    private renderTime() {
        if (!this.timeLabel?.isValid) {
            return;
        }
        this.timeLabel.string = this.formatTime(this.remainingSeconds);
    }

    private findLabelByPath(path: string) {
        const targetNode = this.node.getChildByPath(path);
        return targetNode?.getComponent(Label) ?? targetNode?.getComponentInChildren(Label) ?? null;
    }

    private normalizeSeconds(seconds: number | undefined) {
        if (!Number.isFinite(seconds)) {
            return 0;
        }
        return Math.max(0, Number(seconds));
    }

    private formatTime(totalSeconds: number) {
        const safeSeconds = Math.max(0, totalSeconds);
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = safeSeconds % 60;
        return `${this.formatTwoDigits(minutes)}:${this.formatTwoDigits(seconds)}`;
    }

    private formatTwoDigits(value: number) {
        return value < 10 ? `0${value}` : `${value}`;
    }

    private hide() {
        this.unschedule(this.handleCountdownTick);
        const popup = this.node.getComponent(Popup);
        if (popup) {
            popup.close();
            return;
        }
        this.node.active = false;
    }
}

