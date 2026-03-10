import { _decorator, Component, Node, EventTouch, tween, Vec3, AudioClip, AudioSource } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('ButtonClick')
export class ButtonClick extends Component {
    @property({ type: AudioClip, tooltip: '点击音效' })
    clickSound: AudioClip | null = null;

    @property({ tooltip: '缩小比例' })
    scaleDown = 0.85;

    @property({ tooltip: '缩小时长(秒)' })
    downDuration = 0.08;

    @property({ tooltip: '回弹时长(秒)' })
    upDuration = 0.12;

    @property({ tooltip: '音量 0~1' })
    volume = 1.0;

    private originScale = new Vec3();
    private isTweening = false;

    onLoad() {
        this.originScale.set(this.node.scale);
        this.node.on(Node.EventType.TOUCH_END, this.onClickUp, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onClickCancel, this);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_END, this.onClickUp, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onClickCancel, this);
    }

    private onClickUp() {
        if (this.isTweening) return;
        this.playClickAnim();
        this.playClickSound();
    }

    private onClickCancel() {
        this.resetScale();
    }

    private playClickAnim() {
        this.isTweening = true;
        const downScale = new Vec3(
            this.originScale.x * this.scaleDown,
            this.originScale.y * this.scaleDown,
            this.originScale.z
        );

        tween(this.node)
            .to(this.downDuration, { scale: downScale })
            .to(this.upDuration, { scale: this.originScale })
            .call(() => { this.isTweening = false; })
            .start();
    }

    private playClickSound() {
        if (!this.clickSound) return;

        let audioSource = this.node.getComponent(AudioSource);
        if (!audioSource) {
            audioSource = this.node.addComponent(AudioSource);
        }
        audioSource.clip = this.clickSound;
        audioSource.volume = this.volume;
        audioSource.playOneShot(this.clickSound, this.volume);
    }

    private resetScale() {
        tween(this.node).stop();
        this.node.setScale(this.originScale);
        this.isTweening = false;
    }
}
