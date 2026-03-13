import { _decorator, Component, Node, Button, tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('PopupBackpack')
export class PopupBackpack extends Component {
    @property({ type: Button, tooltip: '种子选项卡按钮' })
    tabSeedBtn: Button | null = null;

    @property({ type: Button, tooltip: '果实选项卡按钮' })
    tabFruitBtn: Button | null = null;

    @property({ type: Node, tooltip: '种子内容节点' })
    seedContent: Node | null = null;

    @property({ type: Node, tooltip: '果实内容节点' })
    fruitContent: Node | null = null;

    @property({ tooltip: '切换动画时长(秒)' })
    duration = 0.25;

    private isTweening = false;

    onLoad() {
        this.switchTab('seed', false);
    }

    onTabSeedClick() {
        this.switchTab('seed', true);
    }

    onTabFruitClick() {
        this.switchTab('fruit', true);
    }

    private switchTab(tab: 'seed' | 'fruit', animate: boolean) {
        if (this.isTweening) return;
        const isSeed = tab === 'seed';

        if (this.tabSeedBtn) this.tabSeedBtn.interactable = !isSeed;
        if (this.tabFruitBtn) this.tabFruitBtn.interactable = isSeed;

        const seedX = isSeed ? 0 : -510;
        const fruitX = isSeed ? 255 : -255;

        if (!animate) {
            this.setPosX(this.seedContent, seedX);
            this.setPosX(this.fruitContent, fruitX);
            return;
        }

        this.isTweening = true;
        this.tweenX(this.seedContent, seedX);
        this.tweenX(this.fruitContent, fruitX, () => {
            this.isTweening = false;
        });
    }

    private setPosX(node: Node | null, x: number) {
        if (!node) return;
        const pos = node.position;
        node.setPosition(x, pos.y, pos.z);
    }

    private tweenX(node: Node | null, x: number, onComplete?: () => void) {
        if (!node) return;
        const pos = node.position;
        tween(node)
            .to(this.duration, { position: new Vec3(x, pos.y, pos.z) }, { easing: 'cubicOut' })
            .call(() => { onComplete?.(); })
            .start();
    }
}
