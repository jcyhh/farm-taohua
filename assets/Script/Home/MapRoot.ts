import { _decorator, Component, EventTouch, Node, UITransform, Vec2, AudioSource } from 'cc';
import { Storage } from '../Utils/Storage';

const { ccclass, property } = _decorator;

@ccclass('MapRoot')
export class MapRoot extends Component {
    @property
    private maxScale = 2;

    private bgmSource: AudioSource | null = null;
    private parentTransform: UITransform | null = null;
    private selfTransform: UITransform | null = null;
    private minScale = 1;
    private pinchStartDistance = 0;
    private pinchStartScale = 1;

    onLoad() {
        this.parentTransform = this.node.parent?.getComponent(UITransform) ?? null;
        this.selfTransform = this.node.getComponent(UITransform);
        this.minScale = this.node.scale.x;

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        this.clampPosition();

        this.bgmSource = this.node.getComponent(AudioSource);
        this.initBgm();
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart(event: EventTouch) {
        const touches = event.getTouches();
        if (touches.length >= 2) {
            this.pinchStartDistance = this.getTouchDistance(touches[0].getUILocation(), touches[1].getUILocation());
            this.pinchStartScale = this.node.scale.x;
        }
    }

    private onTouchMove(event: EventTouch) {
        const touches = event.getTouches();
        if (touches.length >= 2) {
            this.handlePinch(touches[0].getUILocation(), touches[1].getUILocation());
            return;
        }

        const delta = event.getUIDelta();
        this.node.setPosition(
            this.clampX(this.node.position.x + delta.x),
            this.clampY(this.node.position.y + delta.y),
            this.node.position.z
        );
    }

    private onTouchEnd(event: EventTouch) {
        const touches = event.getTouches();
        if (touches.length < 2) {
            this.pinchStartDistance = 0;
            this.pinchStartScale = this.node.scale.x;
        }
    }

    private clampPosition() {
        this.node.setPosition(
            this.clampX(this.node.position.x),
            this.clampY(this.node.position.y),
            this.node.position.z
        );
    }

    private handlePinch(firstTouch: Vec2, secondTouch: Vec2) {
        const currentDistance = this.getTouchDistance(firstTouch, secondTouch);
        if (currentDistance <= 0) {
            return;
        }

        if (this.pinchStartDistance <= 0) {
            this.pinchStartDistance = currentDistance;
            this.pinchStartScale = this.node.scale.x;
            return;
        }

        const nextScale = this.clampScale(this.pinchStartScale * (currentDistance / this.pinchStartDistance));
        this.node.setScale(nextScale, nextScale, 1);
        this.clampPosition();
    }

    private clampScale(targetScale: number) {
        return Math.max(this.minScale, Math.min(this.maxScale, targetScale));
    }

    private clampX(targetX: number) {
        if (!this.parentTransform || !this.selfTransform) {
            return this.node.position.x;
        }

        const viewWidth = this.parentTransform.width;
        const mapWidth = this.selfTransform.width * this.node.scale.x;

        if (mapWidth <= viewWidth) {
            return 0;
        }

        const halfOverflow = (mapWidth - viewWidth) * 0.5;
        const minX = -halfOverflow;
        const maxX = halfOverflow;

        return Math.max(minX, Math.min(maxX, targetX));
    }

    private clampY(targetY: number) {
        if (!this.parentTransform || !this.selfTransform) {
            return this.node.position.y;
        }

        const viewHeight = this.parentTransform.height;
        const mapHeight = this.selfTransform.height * this.node.scale.y;

        if (mapHeight <= viewHeight) {
            return 0;
        }

        const halfOverflow = (mapHeight - viewHeight) * 0.5;
        const minY = -halfOverflow;
        const maxY = halfOverflow;

        return Math.max(minY, Math.min(maxY, targetY));
    }

    private getTouchDistance(firstTouch: Vec2, secondTouch: Vec2) {
        return Vec2.distance(firstTouch, secondTouch);
    }

    private initBgm() {
        if (!this.bgmSource) return;

        const isOn = Storage.getBool('bgmOn', true);
        if (!isOn) {
            this.scheduleOnce(() => {
                this.bgmSource?.stop();
            }, 0);
        }
    }
}

