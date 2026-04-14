import { _decorator, Component, director, Label, Node, resources, Sprite, SpriteFrame } from 'cc';
import { Popup } from '../Common/Popup';
import { FightResultStore } from './FightResultStore';
import { AudioManager } from '../Manager/AudioManager';
import { t } from '../Config/I18n';
import { formatAmount } from '../Utils/Format';
const { ccclass, property } = _decorator;

const HOME_SCENE_NAME = 'Home';

type PopupResultPayload = {
    winner?: number | string;
    player1_income?: number | string;
};

const RESULT_SPRITE_PATH_MAP: Record<string, string> = {
    win: 'imgs/20/spriteFrame',
    lose: 'imgs/21/spriteFrame',
    draw: 'imgs/22/spriteFrame',
};

@ccclass('PopupResult')
export class PopupResult extends Component {
    @property({ type: Sprite, tooltip: '结果图片节点，拖拽 popupContent/result 到这里' })
    resultSprite: Sprite | null = null;

    @property({ type: Label, tooltip: '结果文案节点，拖拽 popupContent/message 到这里' })
    messageLabel: Label | null = null;

    @property({ type: Label, tooltip: '收益节点，拖拽 popupContent/amount 到这里' })
    amountLabel: Label | null = null;

    onLoad() {
        this.resultSprite = this.resultSprite
            ?? this.node.getChildByPath('popupContent/result')?.getComponent(Sprite)
            ?? null;
        this.messageLabel = this.messageLabel
            ?? this.node.getChildByPath('popupContent/message')?.getComponent(Label)
            ?? null;
        this.amountLabel = this.amountLabel
            ?? this.node.getChildByPath('popupContent/amount')?.getComponent(Label)
            ?? null;
    }

    async showResult(payload: PopupResultPayload) {
        const resultType = this.pickResultType(payload?.winner);
        this.renderMessage(resultType);
        this.renderAmount(payload?.player1_income);
        await this.renderResultSprite(resultType);
        this.playResultSound(resultType);

        const popup = this.node.getComponent(Popup);
        if (popup) {
            popup.open();
            return;
        }
        this.node.active = true;
    }

    onBackHome() {
        FightResultStore.clear();

        const popup = this.node.getComponent(Popup);
        if (popup) {
            popup.close();
        } else {
            this.node.active = false;
        }

        director.loadScene(HOME_SCENE_NAME);
    }

    private pickResultType(winner: number | string | undefined) {
        const winnerValue = Number(winner);
        if (winnerValue === 1) {
            return 'win';
        }
        if (winnerValue === 2) {
            return 'lose';
        }
        return 'draw';
    }

    private renderMessage(resultType: string) {
        if (!this.messageLabel?.isValid) {
            return;
        }

        if (resultType === 'win') {
            this.messageLabel.string = t('对决胜利！恭喜获得');
            return;
        }
        if (resultType === 'lose') {
            this.messageLabel.string = t('非常遗憾！对决失败');
            return;
        }
        this.messageLabel.string = t('对决平局！再接再厉');
    }

    private renderAmount(amount: number | string | undefined) {
        if (!this.amountLabel?.isValid) {
            return;
        }
        this.amountLabel.string = formatAmount(amount ?? 0);
    }

    private renderResultSprite(resultType: string) {
        const spritePath = RESULT_SPRITE_PATH_MAP[resultType] ?? RESULT_SPRITE_PATH_MAP.draw;
        if (!this.resultSprite?.isValid) {
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            resources.load(spritePath, SpriteFrame, (error, spriteFrame) => {
                if (error) {
                    console.error(`[PopupResult] 加载结果图片失败: ${spritePath}`, error);
                    resolve();
                    return;
                }
                if (this.resultSprite?.isValid) {
                    this.resultSprite.spriteFrame = spriteFrame;
                }
                resolve();
            });
        });
    }

    private playResultSound(resultType: string) {
        if (resultType === 'win') {
            AudioManager.instance?.playWin();
            return;
        }
        if (resultType === 'lose') {
            AudioManager.instance?.playFail();
            return;
        }
        AudioManager.instance?.playDraw();
    }
}

