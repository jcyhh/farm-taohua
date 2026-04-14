import { _decorator, Component, EditBox } from 'cc';
import { Api } from '../Config/Api';
import { Popup } from '../Common/Popup';
import { Toast } from '../Common/Toast';
import { t } from '../Config/I18n';
import { MapRoot } from './MapRoot';

const { ccclass, property } = _decorator;

@ccclass('PopupInvite')
export class PopupInvite extends Component {
    @property({ type: EditBox, tooltip: '对方手机号输入框' })
    inviteIdEditBox: EditBox | null = null;

    onLoad() {
        this.inviteIdEditBox = this.inviteIdEditBox
            ?? this.node.getChildByPath('popupContent/EditBox')?.getComponent(EditBox)
            ?? null;
    }

    onEnable() {
        if (this.inviteIdEditBox) {
            this.inviteIdEditBox.string = '';
        }
    }

    async onConfirmInvite() {
        const inviteId = this.inviteIdEditBox?.string?.trim() ?? '';
        if (!inviteId) {
            Toast.showFail(t('请输入对方手机号'));
            return;
        }

        const amount = Number(String(MapRoot.instance?.getSelectedBoxAmount() ?? 0).replace(/,/g, ''));
        if (!Number.isFinite(amount) || amount <= 0) {
            Toast.showFail(t('下注金额无效'));
            return;
        }

        try {
            const response = await Api.treeBattleInvite({
                phone: inviteId,
                amount,
            });
            this.node.getComponent(Popup)?.close();
            MapRoot.instance?.startStep2ManualMatchFlow(inviteId, response.invite_id);
        } catch (error) {
            console.error('[PopupInvite] 发起邀请失败:', error);
        }
    }
}

