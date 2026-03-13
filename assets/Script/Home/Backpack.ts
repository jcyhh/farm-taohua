import { _decorator, Component, tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Backpack')
export class Backpack extends Component {
    @property({ tooltip: '动画时长(秒)' })
    duration = 0.25;

    private readonly hideY = -253;
    private readonly showY = 92;
    private isTweening = false;

    onLoad() {
        const pos = this.node.position;
        this.node.setPosition(pos.x, this.hideY, pos.z);
    }

    show() {
        this.slideTo(this.showY);
    }

    hide() {
        this.slideTo(this.hideY);
    }

    private slideTo(targetY: number) {
        if (this.isTweening) return;
        this.isTweening = true;
        const pos = this.node.position;
        tween(this.node)
            .to(this.duration, { position: new Vec3(pos.x, targetY, pos.z) }, { easing: 'cubicOut' })
            .call(() => { this.isTweening = false; })
            .start();
    }
}
