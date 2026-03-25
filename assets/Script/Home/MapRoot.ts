import { _decorator, Component, director, EventTouch, Node, UITransform, Vec2 } from 'cc';
import { Api, LandListItem, LandListResponse } from '../Config/Api';
import { LAND_TYPE_CHANGED_EVENT } from './PopupPicker';
import { Land } from '../Prefab/Land';
import { Storage } from '../Utils/Storage';

const { ccclass, property } = _decorator;
const PICKER_STORAGE_KEY = 'popup_picker_value';
const DEFAULT_LAND_TYPE = 1;

@ccclass('MapRoot')
export class MapRoot extends Component {
    private static _instance: MapRoot | null = null;

    @property
    private maxScale = 2;

    private parentTransform: UITransform | null = null;
    private selfTransform: UITransform | null = null;
    private minScale = 1;
    private pinchStartDistance = 0;
    private pinchStartScale = 1;
    private _touchStartPos = new Vec2();
    private landMap = new Map<number, Land>();
    private readonly refreshLandListTimer = () => {
        void this.loadLandList();
    };
    private refreshRequestVersion = 0;

    static get instance(): MapRoot | null {
        return MapRoot._instance;
    }

    onLoad() {
        MapRoot._instance = this;
        this.parentTransform = this.node.parent?.getComponent(UITransform) ?? null;
        this.selfTransform = this.node.getComponent(UITransform);
        this.minScale = this.node.scale.x;

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        director.on(LAND_TYPE_CHANGED_EVENT, this.onLandTypeChanged, this);
        this.collectLands();
        this.clampPosition();
        void this.loadLandList();
    }

    onDestroy() {
        if (MapRoot._instance === this) {
            MapRoot._instance = null;
        }
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        director.off(LAND_TYPE_CHANGED_EVENT, this.onLandTypeChanged, this);
        this.unschedule(this.refreshLandListTimer);
    }

    private onTouchStart(event: EventTouch) {
        this._touchStartPos.set(event.getUILocation());
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

            const endPos = event.getUILocation();
            if (Vec2.distance(this._touchStartPos, endPos) < 10) {
                const before = Land.currentSelected;
                this.scheduleOnce(() => {
                    if (Land.currentSelected === before) {
                        Land.deselectCurrent();
                    }
                }, 0);
            }
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

    private onLandTypeChanged() {
        this.refreshLandListNow();
    }

    refreshLandListNow() {
        this.refreshRequestVersion += 1;
        this.unschedule(this.refreshLandListTimer);
        void this.loadLandList();
    }

    private async loadLandList() {
        const requestVersion = this.refreshRequestVersion;
        try {
            this.unschedule(this.refreshLandListTimer);
            const landType = Storage.getNumber(PICKER_STORAGE_KEY, DEFAULT_LAND_TYPE);
            const response = await Api.landList(landType);
            if (requestVersion !== this.refreshRequestVersion) {
                return;
            }
            this.applyLandList(response, landType);
            this.scheduleNextRefresh(response, requestVersion);
        } catch (error) {
            console.error('[MapRoot] 获取土地列表失败:', error);
        }
    }

    private collectLands() {
        this.landMap.clear();
        const landsRoot = this.node.getChildByName('lands');
        if (!landsRoot) {
            console.error('[MapRoot] 未找到 lands 节点');
            return;
        }

        for (const child of landsRoot.children) {
            const land = child.getComponent(Land);
            const landIndex = this.parseLandIndex(child.name);
            if (!land || !landIndex) continue;
            this.landMap.set(landIndex, land);
        }
    }

    private applyLandList(response: LandListResponse, landType: number) {
        const list = this.pickLandList(response);
        const baseLandId = (landType - 1) * 10;
        const matchedLandIndexes = new Set<number>();

        for (const item of list) {
            const landId = Number(item.land_id);
            if (!Number.isFinite(landId) || landId <= 0) continue;

            const landIndex = landId - baseLandId;
            if (landIndex < 1 || landIndex > 10) continue;

            matchedLandIndexes.add(landIndex);
            this.landMap.get(landIndex)?.setLandData(item);
        }

        for (const [landIndex, land] of this.landMap.entries()) {
            if (!matchedLandIndexes.has(landIndex)) {
                land.setLandData(null);
            }
        }
    }

    private pickLandList(response: LandListResponse): LandListItem[] {
        if (Array.isArray(response.land_list)) {
            return response.land_list;
        }

        if (Array.isArray(response.list)) {
            return response.list;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (response.data && !Array.isArray(response.data)) {
            if (Array.isArray(response.data.land_list)) {
                return response.data.land_list;
            }
            if (Array.isArray(response.data.list)) {
                return response.data.list;
            }
        }

        return [];
    }

    private scheduleNextRefresh(response: LandListResponse, requestVersion: number) {
        if (requestVersion !== this.refreshRequestVersion) {
            return;
        }

        const refreshTime = this.pickRefreshTime(response);
        if (refreshTime <= 0) {
            return;
        }

        this.scheduleOnce(this.refreshLandListTimer, refreshTime);
    }

    private pickRefreshTime(response: LandListResponse) {
        const rawValue = response.refresh_time
            ?? ((response.data && !Array.isArray(response.data)) ? response.data.refresh_time : undefined);
        const value = Number(rawValue);
        return Number.isFinite(value) && value > 0 ? value : 0;
    }

    private parseLandIndex(name: string) {
        const match = name.match(/land(\d+)$/);
        const landIndex = Number(match?.[1]);
        return Number.isFinite(landIndex) && landIndex > 0 ? landIndex : 0;
    }
}
