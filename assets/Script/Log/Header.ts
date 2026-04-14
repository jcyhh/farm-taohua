import { _decorator, Component, director, Label } from 'cc';
import { t } from '../Config/I18n';
import { Log } from './Log';
const { ccclass } = _decorator;

@ccclass('Header')
export class Header extends Component {
    private titleLabel: Label | null = null;

    onLoad() {
        director.preloadScene('Home');
        this.titleLabel = this.node.getChildByName('Label')?.getComponent(Label) ?? null;
        this.refreshTitle(Log.getPendingType());
    }

    onQuit() {
        this.backHome();
    }

    backHome() {
        director.loadScene('Home');
    }

    private refreshTitle(type: number | string) {
        if (!this.titleLabel) return;
        this.titleLabel.string = String(type) === '2' ? t('灵泉水明细') : t('桃花果明细');
    }
}

