import { _decorator, Component } from 'cc';
import { Toast } from '../Common/Toast';
import { t } from '../Config/I18n';
import { Switch } from '../Common/Switch';
import { AudioManager } from '../Manager/AudioManager';

const { ccclass, property } = _decorator;

@ccclass('PopupSetting')
export class PopupSetting extends Component {
    private static readonly GROUP_8 = '541137708';
    private static readonly GROUP_7 = '1063562123';

    @property({ type: Switch, tooltip: '背景音乐开关' })
    bgmSwitch: Switch | null = null;

    @property({ type: Switch, tooltip: '音效开关' })
    sfxSwitch: Switch | null = null;

    onEnable() {
        const mgr = AudioManager.instance;
        if (this.bgmSwitch && mgr) {
            this.bgmSwitch.setState(mgr.isBgmOn);
        }
        if (this.sfxSwitch && mgr) {
            this.sfxSwitch.setState(mgr.isSfxOn);
        }
    }

    onBgmSwitchChanged(isOn: boolean) {
        AudioManager.instance?.setBgmOn(isOn);
    }

    onSfxSwitchChanged(isOn: boolean) {
        AudioManager.instance?.setSfxOn(isOn);
        if (isOn) {
            AudioManager.instance?.playClick();
        }
    }

    async onCopyGroup8() {
        await this.copyGroupNumber(PopupSetting.GROUP_8);
    }

    async onCopyGroup7() {
        await this.copyGroupNumber(PopupSetting.GROUP_7);
    }

    private async copyGroupNumber(text: string) {
        try {
            const copied = await this.copyToClipboard(text);
            if (!copied) {
                console.error('[PopupSetting] 复制群号失败:', text);
                return;
            }
            Toast.showSuccess(t('复制成功'));
        } catch (error) {
            console.error('[PopupSetting] 复制群号失败:', error);
        }
    }

    private async copyToClipboard(text: string) {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return false;
        }

        const clipboard = (navigator as any)?.clipboard;
        if (clipboard?.writeText) {
            await clipboard.writeText(text);
            return true;
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            return document.execCommand('copy');
        } finally {
            document.body.removeChild(textarea);
        }
    }
}
