import { _decorator, Component, director, EventTouch, Node, Sprite, SpriteFrame, Enum, tween, UITransform, UIOpacity, Vec2, Vec3, log } from 'cc';
import { Api, LandInfo as LandInfoData, LandListItem, LandOperateParams, LandSowResponse } from '../Config/Api';
import { t } from '../Config/I18n';
import { Toast } from '../Common/Toast';
import { AudioManager } from '../Manager/AudioManager';
import { Backpack } from '../Home/Backpack';
import { LandInfo } from '../Home/LandInfo';
import { MapRoot } from '../Home/MapRoot';
import { UiHeadbar } from '../Home/UiHeadbar';
import { RemoteSpriteCache } from '../Utils/RemoteSpriteCache';
import { Storage } from '../Utils/Storage';

const { ccclass, property } = _decorator;
export const LAND_FOCUS_CHANGED_EVENT = 'land-focus-changed';

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
const LAND_CLICK_CANCEL_DISTANCE = 10;

@ccclass('Land')
export class Land extends Component {
    private static readonly PICKER_STORAGE_KEY = 'popup_picker_value';
    private static readonly DEFAULT_LAND_TYPE = 1;
    private static readonly _instances = new Set<Land>();
    private static _currentLandType = Land.DEFAULT_LAND_TYPE;
    private static readonly LAND_SWITCH_SQUASH = new Vec3(0.9, 1.04, 1);
    private static readonly LAND_SWITCH_BOUNCE = new Vec3(1.04, 0.98, 1);
    private static readonly LAND_NORMAL_SCALE = new Vec3(1, 1, 1);

    state: LandState = LandState.Unplanted;

    @property({ type: Node, tooltip: '植物节点' })
    tree: Node | null = null;

    @property({ type: Sprite, tooltip: '植物图片组件' })
    treeSprite: Sprite | null = null;

    @property({ type: Node, tooltip: '浇水按钮节点' })
    water: Node | null = null;

    @property({ type: Node, tooltip: '清除按钮节点' })
    clear: Node | null = null;

    @property({ type: Node, tooltip: '采摘按钮节点' })
    pick: Node | null = null;

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

    @property({ type: SpriteFrame, tooltip: '沙土地图片' })
    landFrame1: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: '褐土地图片' })
    landFrame2: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: '金土地图片' })
    landFrame3: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: '红土地图片' })
    landFrame4: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: '黑土地图片' })
    landFrame5: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: '浇水雨滴图片' })
    holyWaterFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: '成熟图兜底图片' })
    mockTreeFrame: SpriteFrame | null = null;

    private _landUT: UITransform | null = null;
    private _selected = false;
    private _landData: LandListItem | null = null;
    private _treeRenderVersion = 0;
    private effectLayer: Node | null = null;
    private originScale = new Vec3();
    private isSelectTweening = false;
    private suppressLandClick = false;
    private landTouchStartPos = new Vec2();

    private static _currentSelected: Land | null = null;
    static get currentSelected(): Land | null { return Land._currentSelected; }

    get landData(): LandListItem | null {
        return this._landData;
    }

    static setLandType(value: number, playAnim = true) {
        const nextType = Land.normalizeLandType(value);
        const shouldAnimate = playAnim && nextType !== Land._currentLandType;
        Land._currentLandType = nextType;
        for (const land of Land._instances) {
            land.applyLandSprite(Land._currentLandType, shouldAnimate);
        }
    }

    static applyStoredLandType(storageKey = Land.PICKER_STORAGE_KEY, defaultValue = Land.DEFAULT_LAND_TYPE) {
        const value = Storage.getNumber(storageKey, defaultValue);
        Land.setLandType(value, false);
    }

    static deselectCurrent() {
        if (Land._currentSelected) {
            Land._currentSelected.deselect();
        }
    }

    onLoad() {
        Land._instances.add(this);
        this.originScale.set(this.node.scale);
        this.applyState();
        if (this.landSprite) {
            this._landUT = this.landSprite.getComponent(UITransform);
        }
        if (this.selectNode) this.selectNode.active = false;
        this.applyLandSprite(Land._currentLandType, false);
        this.ensureEffectLayer();
        this.node.on(Node.EventType.TOUCH_START, this.onLandTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onLandTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onLandTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onLandTouchEnd, this);
        this.water?.on(Node.EventType.TOUCH_END, this.onWaterClick, this);
        this.pick?.on(Node.EventType.TOUCH_END, this.onPickClick, this);
        this.clear?.on(Node.EventType.TOUCH_END, this.onRemoveClick, this);
    }

    onDestroy() {
        this.unscheduleAllCallbacks();
        tween(this.node).stop();
        this.tree?.isValid && tween(this.tree).stop();
        this.landSprite?.isValid && tween(this.landSprite).stop();
        this.safeOff(this.node, Node.EventType.TOUCH_START, this.onLandTouchStart);
        this.safeOff(this.node, Node.EventType.TOUCH_MOVE, this.onLandTouchMove);
        this.safeOff(this.node, Node.EventType.TOUCH_END, this.onLandTouchEnd);
        this.safeOff(this.node, Node.EventType.TOUCH_CANCEL, this.onLandTouchEnd);
        this.safeOff(this.water, Node.EventType.TOUCH_END, this.onWaterClick);
        this.safeOff(this.pick, Node.EventType.TOUCH_END, this.onPickClick);
        this.safeOff(this.clear, Node.EventType.TOUCH_END, this.onRemoveClick);
        if (Land._currentSelected === this) {
            Land._currentSelected = null;
        }
        Land._instances.delete(this);
    }

    get selected(): boolean { return this._selected; }

    setLandData(data: LandListItem | null) {
        const prevHasPlant = this.hasPlantByLandData(this._landData);
        this._landData = data;
        this.applyState();
        const nextHasPlant = this.hasPlantByLandData(this._landData);
        if (this._selected && prevHasPlant !== nextHasPlant) {
            this.updateFocusPanelByStatus();
        }
    }

    getLandIndex() {
        const match = this.node.name.match(/land(\d+)$/);
        const landIndex = Number(match?.[1]);
        return Number.isFinite(landIndex) && landIndex > 0 ? landIndex : 0;
    }

    getRequestLandId(storageKey = Land.PICKER_STORAGE_KEY) {
        const landIndex = this.getLandIndex();
        if (!landIndex) return 0;
        const landType = Storage.getNumber(storageKey, Land.DEFAULT_LAND_TYPE);
        return (landType - 1) * 10 + landIndex;
    }

    select() {
        if (Land._currentSelected && Land._currentSelected !== this) {
            Land._currentSelected.deselect(false, false);
        }
        this._selected = true;
        Land._currentSelected = this;
        if (this.selectNode) this.selectNode.active = true;
        this.playSelectFeedback();
        this.updateFocusPanelByStatus();
    }

    deselect(shouldHideBackpack: boolean = true, shouldNotifyFocusChange: boolean = true) {
        this._selected = false;
        if (Land._currentSelected === this) {
            Land._currentSelected = null;
        }
        if (this.selectNode) this.selectNode.active = false;
        if (shouldHideBackpack && !Land._currentSelected) {
            Backpack.instance?.hide();
        }
        if (shouldNotifyFocusChange && !Land._currentSelected) {
            director.emit(LAND_FOCUS_CHANGED_EVENT, null);
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
        const landStatus = this.getLandStatus();
        if (landStatus !== null) {
            void this.applyStateFromLandInfo(landStatus);
            return;
        }

        const isPlanted = this.state !== LandState.Unplanted;

        if (this.tree) {
            this.tree.active = isPlanted;
            if (isPlanted) {
                this.playTreePopAnim();
            }
        }
        if (this.water) this.water.active = this.state === LandState.Mature;
        if (this.clear) this.clear.active = this.state === LandState.Withered;
        if (this.pick) this.pick.active = false;

        if (isPlanted && this.treeSprite) {
            this.treeSprite.spriteFrame = this.getFrame();
        }
    }

    private async applyStateFromLandInfo(status: number) {
        const hasPlant = status >= 1 && status <= 4;
        const currentRenderVersion = ++this._treeRenderVersion;

        if (this.tree) {
            this.tree.active = hasPlant;
            this.tree.setScale(1, 1, 1);
        }
        if (this.water) this.water.active = status === 1;
        if (this.clear) this.clear.active = status === 4;
        if (this.pick) this.pick.active = status === 3;

        if (!hasPlant || !this.treeSprite) {
            this.treeSprite && (this.treeSprite.spriteFrame = null);
            return;
        }

        const fixedFrame = this.getTreeFrameByLandInfo(status);
        if (fixedFrame) {
            this.treeSprite.spriteFrame = fixedFrame;
            return;
        }

        const ripeUrl = String(this._landData?.land_info?.ripe_img ?? '');
        if (!this.isRenderableImageUrl(ripeUrl)) {
            this.treeSprite.spriteFrame = this.mockTreeFrame ?? this.matureFrame ?? this.seedlingFrame;
            return;
        }

        await this.applyRemoteTreeSprite(ripeUrl, currentRenderVersion);
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

    private getTreeFrameByLandInfo(status: number) {
        if (status === 4) {
            return this.witheredFrame;
        }

        if (status === 2 && this.shouldShowSapling()) {
            return this.sproutFrame;
        }

        if (status === 1 || status === 2) {
            return this.seedlingFrame;
        }

        return null;
    }

    private shouldShowSapling() {
        const landInfo = this._landData?.land_info;
        const ripeDay = Number(landInfo?.ripe_day ?? 0);
        return ripeDay === 0 && this.isNextRipeMoreThan12Hours(landInfo?.next_ripe_time);
    }

    private isNextRipeMoreThan12Hours(nextRipeTime?: string) {
        const target = this.parseChinaDate(nextRipeTime);
        if (!target) return false;
        return target.getTime() - Date.now() > 12 * 60 * 60 * 1000;
    }

    private parseChinaDate(dateTime?: string) {
        if (!dateTime) return null;
        const normalized = String(dateTime).trim().replace(' ', 'T');
        if (!normalized) return null;
        const hasTimezone = /([zZ]|[+\-]\d{2}:?\d{2})$/.test(normalized);
        const target = new Date(hasTimezone ? normalized : `${normalized}+08:00`);
        if (Number.isNaN(target.getTime())) return null;
        return target;
    }

    private getLandStatus() {
        const status = Number(this._landData?.land_info?.status);
        return Number.isFinite(status) ? status : null;
    }

    private hasPlantByLandData(data: LandListItem | null) {
        const status = Number(data?.land_info?.status);
        return Number.isFinite(status) && status >= 1 && status <= 4;
    }

    private updateFocusPanelByStatus() {
        if (!this._selected) return;

        if (this.hasPlantByLandData(this._landData)) {
            Backpack.instance?.hide();
            director.emit(LAND_FOCUS_CHANGED_EVENT, this);
            return;
        }

        director.emit(LAND_FOCUS_CHANGED_EVENT, null);
        Backpack.instance?.show();
    }

    private onWaterClick(event?: EventTouch) {
        if (event) event.propagationStopped = true;
        void this.runLandOperation('water');
    }

    private onLandTouchStart(event: EventTouch) {
        if (event.target !== this.node) return;
        this.landTouchStartPos.set(event.getUILocation());
        this.suppressLandClick = event.getTouches().length >= 2;
        MapRoot.instance?.onExternalTouchStart(event);
    }

    private onLandTouchMove(event: EventTouch) {
        if (event.target !== this.node) return;
        const currentPos = event.getUILocation();
        if (
            event.getTouches().length >= 2
            || Vec2.distance(this.landTouchStartPos, currentPos) >= LAND_CLICK_CANCEL_DISTANCE
        ) {
            this.suppressLandClick = true;
        }
        MapRoot.instance?.onExternalTouchMove(event);
    }

    private onLandTouchEnd(event: EventTouch) {
        if (event.target !== this.node) return;
        MapRoot.instance?.onExternalTouchEnd(event);
    }

    private onPickClick(event?: EventTouch) {
        if (event) event.propagationStopped = true;
        void this.runLandOperation('pick');
    }

    private onRemoveClick(event?: EventTouch) {
        if (event) event.propagationStopped = true;
        void this.runLandOperation('remove');
    }

    private async runLandOperation(action: 'water' | 'pick' | 'remove') {
        const payload = this.buildLandOperateParams();
        if (!payload) return;
        const pickYieldCount = action === 'pick' ? this.getPickYieldCount() : 0;
        const pickSourceWorldPos = action === 'pick' ? this.getHarvestSourceWorldPosition() : null;

        try {
            const response = await this.requestLandOperation(action, payload);
            const landInfo = this.pickOperationLandInfo(response);
            if (!landInfo) {
                console.warn(`[Land] ${action} 成功，但未返回 land_info:`, response);
                return;
            }

            if (action === 'remove') {
                await this.playTreeRemoveEffect();
            }
            if (action === 'water') {
                await this.playWateringEffect();
            }
            if (action === 'remove') {
                AudioManager.instance?.playFruit();
            }
            this.applyLatestLandInfo(landInfo);
            const effectTasks: Promise<void>[] = [];
            if (action !== 'remove' && this.hasPlantByLandInfo(landInfo)) {
                effectTasks.push(this.playTreeRefreshEffect());
            }
            if (action === 'pick') {
                effectTasks.push(this.playHarvestFruitFlyEffect(pickYieldCount, pickSourceWorldPos));
            }
            if (effectTasks.length > 0) {
                await Promise.all(effectTasks);
            }
            if (action === 'pick' || action === 'water') {
                await UiHeadbar.refreshUserInfo();
            }
            Toast.showSuccess(this.getOperationSuccessText(action));
        } catch (error) {
            console.error(`[Land] ${action} 失败:`, error);
        }
    }

    private buildLandOperateParams(): LandOperateParams | null {
        const sowDetailId = Number(this._landData?.land_info?.id);
        if (!Number.isFinite(sowDetailId) || sowDetailId <= 0) {
            Toast.showFail(t('土地状态数据异常'));
            return null;
        }

        return {
            sow_detail_id: sowDetailId,
        };
    }

    private requestLandOperation(action: 'water' | 'pick' | 'remove', payload: LandOperateParams) {
        switch (action) {
            case 'water':
                return Api.landWater(payload);
            case 'pick':
                return Api.landPick(payload);
            case 'remove':
                return Api.landRemove(payload);
        }
    }

    private pickOperationLandInfo(response: LandSowResponse) {
        return response.land_info ?? response.data?.land_info ?? null;
    }

    private applyLatestLandInfo(landInfo: LandInfoData) {
        const latestLandData: LandListItem = {
            ...(this._landData ?? {}),
            land_id: Number(landInfo.land_id ?? this.getRequestLandId()),
            land_info: landInfo,
        };
        this.setLandData(latestLandData);
        LandInfo.instance?.applyLatestLandInfo(this, landInfo);
    }

    private getOperationSuccessText(action: 'water' | 'pick' | 'remove') {
        switch (action) {
            case 'water': return t('浇水成功');
            case 'pick': return t('采摘成功');
            case 'remove': return t('铲除成功');
        }
    }

    private getPickYieldCount() {
        const landInfo = this._landData?.land_info;
        const yieldCount = Number(landInfo?.this_ripe_yield ?? landInfo?.ripe_yield ?? landInfo?.count_yield ?? 0);
        return Number.isFinite(yieldCount) && yieldCount > 0 ? yieldCount : 0;
    }

    private getHarvestSourceWorldPosition() {
        const sourceNode = this.tree?.isValid ? this.tree : (this.pick?.isValid ? this.pick : this.node);
        const worldPos = new Vec3();
        sourceNode.getWorldPosition(worldPos);
        worldPos.y += this.tree?.active ? 40 : 90;
        return worldPos;
    }

    private isRenderableImageUrl(url: string) {
        if (!url) return false;

        const normalizedUrl = url.split('?')[0].split('#')[0];
        const lastSegment = normalizedUrl.split('/').pop() ?? '';
        if (!lastSegment || !lastSegment.includes('.')) {
            return false;
        }

        return /\.(png|jpe?g|webp|gif)$/i.test(lastSegment);
    }

    private playSelectFeedback() {
        AudioManager.instance?.playClick();
        if (this.isSelectTweening) return;

        this.isSelectTweening = true;
        const downScale = new Vec3(
            this.originScale.x * 0.85,
            this.originScale.y * 0.85,
            this.originScale.z
        );

        tween(this.node)
            .stop()
            .to(0.08, { scale: downScale })
            .to(0.12, { scale: this.originScale })
            .call(() => { this.isSelectTweening = false; })
            .start();
    }

    private hasPlantByLandInfo(landInfo: LandInfoData | null) {
        const status = Number(landInfo?.status);
        return Number.isFinite(status) && status >= 1 && status <= 4;
    }

    private playTreeRefreshEffect() {
        if (!this.tree?.isValid) {
            return Promise.resolve();
        }

        tween(this.tree).stop();
        this.tree.setScale(0, 0, 1);
        tween(this.tree)
            .to(0.18, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'cubicOut' })
            .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'cubicInOut' })
            .start();

        return new Promise<void>((resolve) => {
            this.scheduleOnce(() => resolve(), 0.3);
        });
    }

    private playTreeRemoveEffect() {
        if (!this.tree?.isValid || !this.tree.active) {
            return Promise.resolve();
        }

        tween(this.tree).stop();
        this.tree.setScale(1, 1, 1);
        tween(this.tree)
            .to(0.12, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'cubicOut' })
            .to(0.18, { scale: new Vec3(0, 0, 1) }, { easing: 'cubicIn' })
            .start();

        return new Promise<void>((resolve) => {
            this.scheduleOnce(() => resolve(), 0.3);
        });
    }

    private ensureEffectLayer() {
        if (this.effectLayer?.isValid) return this.effectLayer;

        this.effectLayer = new Node('effectLayer');
        this.effectLayer.layer = this.node.layer;
        this.node.addChild(this.effectLayer);
        this.effectLayer.setSiblingIndex(this.node.children.length - 1);
        return this.effectLayer;
    }

    private playWateringEffect() {
        const effectLayer = this.ensureEffectLayer();
        const waterFrame = this.holyWaterFrame;
        const treePos = this.tree?.position ?? new Vec3(0, 80, 0);

        if (!effectLayer || !waterFrame) {
            return Promise.resolve();
        }

        AudioManager.instance?.playWater();

        const dropCount = 10;
        let longestDuration = 0;
        for (let i = 0; i < dropCount; i++) {
            const drop = new Node(`waterDrop${i}`);
            drop.layer = this.node.layer;
            effectLayer.addChild(drop);

            const transform = drop.addComponent(UITransform);
            transform.setContentSize(18, 18);

            const sprite = drop.addComponent(Sprite);
            sprite.spriteFrame = waterFrame;

            const opacity = drop.addComponent(UIOpacity);
            opacity.opacity = 0;

            const startX = treePos.x + this.randomRange(-55, 55);
            const startY = treePos.y + this.randomRange(120, 180);
            const endY = treePos.y + this.randomRange(10, 55);
            const startScale = this.randomRange(0.5, 0.9);
            const endScale = startScale * this.randomRange(0.75, 0.95);
            const delay = i * 0.045;
            const duration = this.randomRange(0.32, 0.5);
            longestDuration = Math.max(longestDuration, delay + duration);

            drop.setPosition(startX, startY, 0);
            drop.setScale(startScale, startScale, 1);

            tween(opacity)
                .delay(delay)
                .to(0.06, { opacity: 255 })
                .to(duration * 0.7, { opacity: 220 })
                .to(duration * 0.3, { opacity: 0 })
                .start();

            tween(drop)
                .delay(delay)
                .to(duration, { position: new Vec3(startX + this.randomRange(-12, 12), endY, 0), scale: new Vec3(endScale, endScale, 1) }, { easing: 'quadIn' })
                .call(() => {
                    if (drop.isValid) {
                        drop.destroy();
                    }
                })
                .start();
        }

        return new Promise<void>((resolve) => {
            this.scheduleOnce(() => resolve(), longestDuration + 0.05);
        });
    }

    private getGlobalEffectLayer() {
        const hostNode = UiHeadbar.getEffectHostNode();
        if (!hostNode?.isValid) {
            return null;
        }

        let effectLayer = hostNode.getChildByName('globalFlyEffectLayer');
        if (!effectLayer?.isValid) {
            effectLayer = new Node('globalFlyEffectLayer');
            effectLayer.layer = hostNode.layer;
            hostNode.addChild(effectLayer);
            const hostTransform = hostNode.getComponent(UITransform);
            const layerTransform = effectLayer.addComponent(UITransform);
            layerTransform.setContentSize(hostTransform?.contentSize ?? layerTransform.contentSize);
            effectLayer.setSiblingIndex(hostNode.children.length - 1);
        }

        return effectLayer;
    }

    private worldToEffectPosition(effectLayer: Node, worldPos: Vec3) {
        const transform = effectLayer.getComponent(UITransform);
        if (!transform) {
            return new Vec3(worldPos.x, worldPos.y, worldPos.z);
        }
        return transform.convertToNodeSpaceAR(worldPos, new Vec3());
    }

    private pickFruitFlyCount(yieldCount: number) {
        return 9;
    }

    private playHarvestFruitFlyEffect(yieldCount: number, sourceWorldPos: Vec3 | null) {
        const effectLayer = this.getGlobalEffectLayer();
        const fruitFrame = UiHeadbar.getPeachIconSpriteFrame();
        const targetWorldPos = UiHeadbar.getPeachIconWorldPosition();
        if (!effectLayer || !fruitFrame || !targetWorldPos || !sourceWorldPos) {
            return Promise.resolve();
        }

        this.playFruitBurstSfx();

        const startPos = this.worldToEffectPosition(effectLayer, sourceWorldPos);
        const targetPos = this.worldToEffectPosition(effectLayer, targetWorldPos);
        const fruitCount = this.pickFruitFlyCount(yieldCount);
        let longestDuration = 0;

        for (let i = 0; i < fruitCount; i++) {
            const fruit = new Node(`harvestFruit${i}`);
            fruit.layer = effectLayer.layer;
            effectLayer.addChild(fruit);

            const transform = fruit.addComponent(UITransform);
            transform.setContentSize(42, 42);

            const sprite = fruit.addComponent(Sprite);
            sprite.spriteFrame = fruitFrame;

            const opacity = fruit.addComponent(UIOpacity);
            opacity.opacity = 0;

            const delay = i * 0.035;
            const burstDuration = 0.28;
            const flyDuration = this.randomRange(0.38, 0.5);
            const longestFly = delay + burstDuration + flyDuration;
            longestDuration = Math.max(longestDuration, longestFly);

            const startScale = this.randomRange(0.45, 0.62);
            const burstScale = startScale * this.randomRange(1.05, 1.2);
            const endScale = startScale * 0.3;
            const burstPos = new Vec3(
                startPos.x + this.randomRange(-120, 120),
                startPos.y + this.randomRange(35, 120),
                0
            );
            const endPos = new Vec3(
                targetPos.x + this.randomRange(-8, 8),
                targetPos.y + this.randomRange(-8, 8),
                0
            );

            fruit.setPosition(
                startPos.x + this.randomRange(-18, 18),
                startPos.y + this.randomRange(-12, 18),
                0
            );
            fruit.setScale(startScale, startScale, 1);

            tween(opacity)
                .delay(delay)
                .to(0.05, { opacity: 255 })
                .delay(burstDuration + flyDuration - 0.08)
                .to(0.08, { opacity: 0 })
                .start();

            tween(fruit)
                .delay(delay)
                .to(burstDuration, { position: burstPos, scale: new Vec3(burstScale, burstScale, 1) }, { easing: 'backOut' })
                .to(flyDuration, { position: endPos, scale: new Vec3(endScale, endScale, 1) }, { easing: 'quadIn' })
                .call(() => {
                    UiHeadbar.playPeachIconBounce();
                    if (fruit.isValid) {
                        fruit.destroy();
                    }
                })
                .start();
        }

        return new Promise<void>((resolve) => {
            this.scheduleOnce(() => resolve(), longestDuration + 0.08);
        });
    }

    private playFruitBurstSfx() {
        AudioManager.instance?.playFruit();
        this.scheduleOnce(() => {
            AudioManager.instance?.playFruit();
        }, 0.08);
        this.scheduleOnce(() => {
            AudioManager.instance?.playFruit();
        }, 0.16);
    }

    private randomRange(min: number, max: number) {
        return min + Math.random() * (max - min);
    }

    private async applyRemoteTreeSprite(url: string, renderVersion: number) {
        if (!this.treeSprite) return;

        try {
            const spriteFrame = await RemoteSpriteCache.load(url);
            if (!spriteFrame?.isValid) return;

            if (renderVersion === this._treeRenderVersion && this.treeSprite?.isValid) {
                this.treeSprite.spriteFrame = spriteFrame;
            }
        } catch (error) {
            console.error(`[Land] 加载成熟植物图片失败: ${url}`, error);
            if (renderVersion === this._treeRenderVersion && this.treeSprite?.isValid) {
                this.treeSprite.spriteFrame = this.matureFrame ?? this.seedlingFrame;
            }
        }
    }

    private applyLandSprite(value: number, playAnim = false) {
        const sprite = this.landSprite?.getComponent(Sprite);
        const spriteNode = this.landSprite;
        if (!sprite || !spriteNode) return;

        const frame = this.getLandFrame(value);
        if (!frame) return;

        if (!playAnim) {
            tween(spriteNode).stop();
            spriteNode.setScale(Land.LAND_NORMAL_SCALE);
            sprite.spriteFrame = frame;
            return;
        }

        tween(spriteNode).stop();
        spriteNode.setScale(Land.LAND_NORMAL_SCALE);
        tween(spriteNode)
            .to(0.08, { scale: Land.LAND_SWITCH_SQUASH }, { easing: 'quadOut' })
            .call(() => {
                sprite.spriteFrame = frame;
            })
            .to(0.12, { scale: Land.LAND_SWITCH_BOUNCE }, { easing: 'backOut' })
            .to(0.08, { scale: Land.LAND_NORMAL_SCALE }, { easing: 'quadInOut' })
            .start();
    }

    private getLandFrame(value: number) {
        switch (Land.normalizeLandType(value)) {
            case 1: return this.landFrame1;
            case 2: return this.landFrame2;
            case 3: return this.landFrame3;
            case 4: return this.landFrame4;
            case 5: return this.landFrame5;
            default: return this.landFrame1;
        }
    }

    private static normalizeLandType(value: number) {
        return Math.min(Math.max(Math.floor(value || Land.DEFAULT_LAND_TYPE), 1), 5);
    }

    onClick(event: EventTouch) {
        if (this.suppressLandClick || event.getTouches().length >= 2) {
            this.suppressLandClick = false;
            return;
        }
        this.suppressLandClick = false;
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

    private safeOff(node: Node | null | undefined, eventType: string, callback: (...args: any[]) => void) {
        const target = node as any;
        if (!target?.isValid || !target._eventProcessor) {
            return;
        }
        target.off(eventType, callback, this);
    }
}

export { LandState };
