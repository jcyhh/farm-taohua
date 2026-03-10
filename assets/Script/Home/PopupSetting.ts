import { _decorator, Component, AudioSource } from 'cc';
import { Storage } from '../Utils/Storage';
import { Switch } from '../Common/Switch';

const { ccclass, property } = _decorator;

const STORAGE_KEY = 'bgmOn';

@ccclass('PopupSetting')
export class PopupSetting extends Component {
    @property({ type: AudioSource, tooltip: '背景音乐 AudioSource' })
    bgmSource: AudioSource | null = null;

    @property({ type: Switch, tooltip: '背景音乐开关' })
    bgmSwitch: Switch | null = null;

    onEnable() {
        const isOn = Storage.getBool(STORAGE_KEY, true);
        if (this.bgmSwitch) {
            this.bgmSwitch.setState(isOn);
        }
    }

    onBgmSwitchChanged(isOn: boolean) {
        Storage.setBool(STORAGE_KEY, isOn);

        if (!this.bgmSource) return;

        if (isOn) {
            this.bgmSource.stop();
            this.bgmSource.play();
        } else {
            this.bgmSource.stop();
        }
    }
}
