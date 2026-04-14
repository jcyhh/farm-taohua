import { _decorator, Animation, Component, Label, ProgressBar, UITransform } from 'cc';
import { getSpiritConfig } from '../Config/SpiritConfig';

const { ccclass, property } = _decorator;

@ccclass('Role')
export class Role extends Component {
    @property(Label)
    levelLabel: Label | null = null;

    @property(Label)
    attackPowerLabel: Label | null = null;

    @property(Label)
    defensivePowerLabel: Label | null = null;

    @property(ProgressBar)
    bloodPercentBar: ProgressBar | null = null;

    @property(ProgressBar)
    manaPercentBar: ProgressBar | null = null;

    private initialBloodPercent = 1;
    private initialManaPercent = 1;
    private effectAnimation: Animation | null = null;

    onLoad() {
        this.effectAnimation = this.node.getChildByPath('role/effect')?.getComponent(Animation) ?? null;
        this.hideEffect();
        this.cacheInitialBarProgress();
        this.refreshLayout();
    }

    renderSpiritInfo(spiritId: number | string | null | undefined) {
        const config = getSpiritConfig(spiritId);
        if (!config) {
            this.renderLabel(this.levelLabel, '');
            this.renderLabel(this.attackPowerLabel, '');
            this.renderLabel(this.defensivePowerLabel, '');
            return;
        }

        this.renderLabel(this.levelLabel, `LV.${config.level}`);
        this.renderLabel(this.attackPowerLabel, String(config.attack));
        this.renderLabel(this.defensivePowerLabel, String(config.defense));
    }

    getBloodPercent() {
        return this.readBarProgress(this.bloodPercentBar, this.initialBloodPercent);
    }

    getManaPercent() {
        return this.readBarProgress(this.manaPercentBar, this.initialManaPercent);
    }

    setBloodPercent(percent: number) {
        this.applyBarProgress(this.bloodPercentBar, percent);
    }

    setManaPercent(percent: number) {
        this.applyBarProgress(this.manaPercentBar, percent);
    }

    resetBarPercent() {
        this.setBloodPercent(this.initialBloodPercent);
        this.setManaPercent(this.initialManaPercent);
    }

    hideEffect() {
        const effectNode = this.node.getChildByPath('role/effect');
        if (!effectNode) {
            return;
        }
        effectNode.active = false;
        this.effectAnimation?.stop();
    }

    playEffect() {
        const effectNode = this.node.getChildByPath('role/effect');
        if (!effectNode?.isValid) {
            return Promise.resolve();
        }

        effectNode.active = true;
        const animation = this.effectAnimation ?? effectNode.getComponent(Animation) ?? null;
        this.effectAnimation = animation;
        if (!animation) {
            effectNode.active = false;
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            const finish = () => {
                animation.off(Animation.EventType.FINISHED, finish, this);
                if (effectNode.isValid) {
                    effectNode.active = false;
                }
                resolve();
            };

            animation.off(Animation.EventType.FINISHED, finish, this);
            animation.once(Animation.EventType.FINISHED, finish, this);

            const clipName = animation.defaultClip?.name;
            animation.stop();
            if (clipName) {
                animation.play(clipName);
                return;
            }
            animation.play();
        });
    }

    refreshLayout() {
        this.syncRoleWrapperSize();
        this.scheduleOnce(() => {
            this.syncRoleWrapperSize();
        }, 0);
    }

    private syncRoleWrapperSize() {
        const roleWrapper = this.node.getChildByName('role');
        const roleSpriteNode = roleWrapper?.getChildByName('role') ?? null;
        const wrapperTransform = roleWrapper?.getComponent(UITransform) ?? null;
        const spriteTransform = roleSpriteNode?.getComponent(UITransform) ?? null;

        if (!wrapperTransform || !spriteTransform) {
            return;
        }

        wrapperTransform.setContentSize(
            spriteTransform.width * roleSpriteNode.scale.x,
            spriteTransform.height * roleSpriteNode.scale.y
        );
    }

    private renderLabel(label: Label | null, value: string) {
        if (!label) {
            return;
        }
        label.string = value;
    }

    private cacheInitialBarProgress() {
        this.initialBloodPercent = this.readBarProgress(this.bloodPercentBar, 1);
        this.initialManaPercent = this.readBarProgress(this.manaPercentBar, 1);
    }

    private readBarProgress(bar: ProgressBar | null, defaultValue: number) {
        if (!bar) {
            return this.clampPercent(defaultValue);
        }
        return this.clampPercent(bar.progress);
    }

    private applyBarProgress(bar: ProgressBar | null, percent: number) {
        if (!bar) {
            return;
        }
        bar.progress = this.clampPercent(percent);
    }

    private clampPercent(percent: number) {
        if (!Number.isFinite(percent)) {
            return 0;
        }
        return Math.max(0, Math.min(1, percent));
    }
}

