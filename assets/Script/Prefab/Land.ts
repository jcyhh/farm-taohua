import { _decorator, Component, Node, Sprite, SpriteFrame, Enum, tween, Vec3, UITransform, log, EventTouch } from 'cc';
import { Backpack } from '../Home/Backpack';

const { ccclass, property } = _decorator;

enum LandState {
    Unplanted,   // 未种植
    Sprout,      // 发芽期
    Seedling,    // 幼苗期
    Mature,      // 成熟期
    Withered,    // 枯萎期
}
Enum(LandState);

const _localPos = new Vec3();
const RIGHT_DOWN_OUTSIDE_LANDS = new Set(['land1', 'land2', 'land3']);
const LEFT_DOWN_OUTSIDE_LANDS = new Set(['land3', 'land6', 'land9', 'land10']);
const RIGHT_UP_OUTSIDE_LANDS = new Set(['land1', 'land4', 'land7', 'land10']);
const LEFT_UP_OUTSIDE_LANDS = new Set(['land7', 'land8', 'land10']);

@ccclass('Land')
export class Land extends Component {
    state: LandState = LandState.Unplanted;

    @property({ type: Node, tooltip: '植物节点' })
    tree: Node | null = null;

    @property({ type: Sprite, tooltip: '植物图片组件' })
    treeSprite: Sprite | null = null;

    @property({ type: Node, tooltip: '浇水按钮节点' })
    water: Node | null = null;

    @property({ type: Node, tooltip: '清除按钮节点' })
    clear: Node | null = null;

    @property({ type: SpriteFrame, tooltip: '发芽期图片' })
    sproutFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: '幼苗期图片' })
    seedlingFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: '成熟期图片' })
    matureFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: '枯萎期图片' })
    witheredFrame: SpriteFrame | null = null;

    @property({ type: Node, tooltip: '土地图片节点' })
    landSprite: Node | null = null;

    @property({ type: Node, tooltip: '选中高亮节点' })
    selectNode: Node | null = null;

    private _landUT: UITransform | null = null;
    private _selected = false;

    private static _currentSelected: Land | null = null;
    static get currentSelected(): Land | null { return Land._currentSelected; }

    static deselectCurrent() {
        if (Land._currentSelected) {
            Land._currentSelected.deselect();
        }
    }

    onLoad() {
        this.applyState();
        if (this.landSprite) {
            this._landUT = this.landSprite.getComponent(UITransform);
        }
        if (this.selectNode) this.selectNode.active = false;
    }

    get selected(): boolean { return this._selected; }

    select() {
        if (Land._currentSelected && Land._currentSelected !== this) {
            Land._currentSelected.deselect(false);
        }
        this._selected = true;
        Land._currentSelected = this;
        if (this.selectNode) this.selectNode.active = true;
        Backpack.instance?.show();
    }

    deselect(shouldHideBackpack: boolean = true) {
        this._selected = false;
        if (Land._currentSelected === this) {
            Land._currentSelected = null;
        }
        if (this.selectNode) this.selectNode.active = false;
        if (shouldHideBackpack && !Land._currentSelected) {
            Backpack.instance?.hide();
        }
    }

    hitDiamond(worldPos: Vec3): boolean {
        if (!this._landUT) return false;

        this._landUT.convertToNodeSpaceAR(worldPos, _localPos);

        const halfW = this._landUT.width * 0.5;
        const halfH = this._landUT.height * 0.5;
        if (halfW === 0 || halfH === 0) return false;

        return (Math.abs(_localPos.x) / halfW + Math.abs(_localPos.y) / halfH) <= 1;
    }

    setState(state: LandState) {
        this.state = state;
        this.applyState();
    }

    plant() {
        if (this.state !== LandState.Unplanted) return;
        this.setState(LandState.Sprout);
    }

    grow() {
        if (this.state === LandState.Sprout) {
            this.setState(LandState.Seedling);
        } else if (this.state === LandState.Seedling) {
            this.setState(LandState.Mature);
        }
    }

    wither() {
        if (this.state === LandState.Mature) {
            this.setState(LandState.Withered);
        }
    }

    harvest() {
        if (this.state !== LandState.Mature) return;
        this.setState(LandState.Unplanted);
    }

    clearLand() {
        if (this.state !== LandState.Withered) return;
        this.setState(LandState.Unplanted);
    }

    private applyState() {
        const isPlanted = this.state !== LandState.Unplanted;

        if (this.tree) {
            this.tree.active = isPlanted;
            if (isPlanted) {
                this.playTreePopAnim();
            }
        }
        if (this.water) this.water.active = this.state === LandState.Mature;
        if (this.clear) this.clear.active = this.state === LandState.Withered;

        if (isPlanted && this.treeSprite) {
            this.treeSprite.spriteFrame = this.getFrame();
        }
    }

    private playTreePopAnim() {
        if (!this.tree) return;
        tween(this.tree).stop();
        this.tree.setScale(0, 0, 1);
        tween(this.tree)
            .to(0.3, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'cubicOut' })
            .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'cubicInOut' })
            .start();
    }

    private getFrame(): SpriteFrame | null {
        switch (this.state) {
            case LandState.Sprout: return this.sproutFrame;
            case LandState.Seedling: return this.seedlingFrame;
            case LandState.Mature: return this.matureFrame;
            case LandState.Withered: return this.witheredFrame;
            default: return null;
        }
    }

    onClick(event: EventTouch) {
        const uiPos = event.getUILocation();
        const worldPos = new Vec3(uiPos.x, uiPos.y, 0);

        if (this.hitDiamond(worldPos)) {
            this.onLandClick();
            return;
        }

        if (this.shouldDeselectOnOutsideCorner(worldPos)) {
            Land.deselectCurrent();
            return;
        }

        const siblings = this.node.parent?.children;
        if (!siblings) return;
        for (let i = siblings.length - 1; i >= 0; i--) {
            const land = siblings[i].getComponent(Land);
            if (!land || land === this) continue;
            if (land.hitDiamond(worldPos)) {
                land.onLandClick();
                return;
            }
        }
    }

    onLandClick() {
        log(`点击了: ${this.node.name}`);
        this.select();
    }

    private shouldDeselectOnOutsideCorner(worldPos: Vec3): boolean {
        if (!this._landUT) return false;

        this._landUT.convertToNodeSpaceAR(worldPos, _localPos);
        const isRight = _localPos.x > 0;
        const isLeft = _localPos.x < 0;
        const isUp = _localPos.y > 0;
        const isDown = _localPos.y < 0;
        const landName = this.node.name;

        if (isRight && isDown && RIGHT_DOWN_OUTSIDE_LANDS.has(landName)) {
            return true;
        }
        if (isLeft && isDown && LEFT_DOWN_OUTSIDE_LANDS.has(landName)) {
            return true;
        }
        if (isRight && isUp && RIGHT_UP_OUTSIDE_LANDS.has(landName)) {
            return true;
        }
        if (isLeft && isUp && LEFT_UP_OUTSIDE_LANDS.has(landName)) {
            return true;
        }

        return false;
    }
}

export { LandState };
