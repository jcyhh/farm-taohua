import { _decorator, Component, director, Label } from 'cc';
import { FightResultStore } from './FightResultStore';
const { ccclass, property } = _decorator;

const HOME_SCENE_NAME = 'Home';

@ccclass('FightHeader')
export class FightHeader extends Component {
    @property({ type: Label, tooltip: '玩家1昵称文本，拖拽对应 Label 到这里' })
    player1NameLabel: Label | null = null;

    @property({ type: Label, tooltip: '玩家2昵称文本，拖拽对应 Label 到这里' })
    player2NameLabel: Label | null = null;

    start() {
        const fightResult = FightResultStore.getCurrent();
        const player1Phone = this.pickPhone(fightResult?.player1);
        const player2Phone = this.pickPhone(fightResult?.player2);

        if (this.player1NameLabel?.isValid) {
            this.player1NameLabel.string = player1Phone;
        }
        if (this.player2NameLabel?.isValid) {
            this.player2NameLabel.string = player2Phone;
        }
    }

    private pickPhone(player: Record<string, any> | null | undefined) {
        return String(player?.mphone ?? '');
    }

    onBackHome() {
        FightResultStore.clear();
        director.loadScene(HOME_SCENE_NAME);
    }
}

