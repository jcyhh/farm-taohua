import { _decorator, Component, director, instantiate, Label, Node, Prefab, resources, Sprite, SpriteFrame, tween, Vec3 } from 'cc';
import { Api, LandInfo as LandInfoData, LandListItem } from '../Config/Api';
import { t } from '../Config/I18n';
import { Toast } from '../Common/Toast';
import { LAND_FOCUS_CHANGED_EVENT, Land } from '../Prefab/Land';
import { Storage } from '../Utils/Storage';

const { ccclass, property } = _decorator;

interface BoostCardItem {
    id?: number;
    card_type_id?: number;
    name?: string;
    land_level?: number | string;
    boost_hours?: number | string;
    [key: string]: any;
}

@ccclass('Cards')
export class Cards extends Component {
    private static _instance: Cards | null = null;
    private static readonly CARD_ICON_PATHS: Record<number, string> = {
        5: 'card4/spriteFrame',
        4: 'card4/spriteFrame',
        3: 'card3/spriteFrame',
        2: 'card2/spriteFrame',
        1: 'card/spriteFrame',
        0: 'card/spriteFrame',
    };
    private static readonly iconCache = new Map<string, SpriteFrame | null>();

    @property({ tooltip: '动画时长(秒)' })
    duration = 0.25;

    @property({ tooltip: '土地等级缓存 key' })
    pickerStorageKey = 'popup_picker_value';

    @property({ type: Prefab, tooltip: '卡片预设体' })
    cardPrefab: Prefab | null = null;

    private readonly hideY = -253;
    private readonly showY = 92;
    private listContent: Node | null = null;
    private currentLandId = 0;
    private latestResponse: Record<string, any> | null = null;

    static get instance(): Cards | null {
        return Cards._instance;
    }

    static ensureInstance() {
        if (Cards._instance?.isValid) {
            return Cards._instance;
        }

        const cardsNode = director.getScene()?.getChildByPath('Canvas/UiBotbar/Cards');
        if (!cardsNode) {
            console.warn('[Cards] 未找到 Canvas/UiBotbar/Cards 节点');
            return null;
        }

        return cardsNode.getComponent(Cards) ?? cardsNode.addComponent(Cards);
    }

    onLoad() {
        Cards._instance = this;
        director.on(LAND_FOCUS_CHANGED_EVENT, this.onLandFocusChanged, this);
        this.listContent = this.node.getChildByPath('list/view/content');
        if (!this.cardPrefab) {
            console.error('[Cards] 未绑定 cardPrefab 预设体');
        }
        const pos = this.node.position;
        this.node.setPosition(pos.x, this.hideY, pos.z);
    }

    onDestroy() {
        if (Cards._instance === this) {
            Cards._instance = null;
        }
        director.off(LAND_FOCUS_CHANGED_EVENT, this.onLandFocusChanged, this);
    }

    show(landId: number) {
        if (!Number.isFinite(landId) || landId <= 0) {
            console.warn('[Cards] 土地ID无效，无法打开加速卡面板:', landId);
            return;
        }

        this.currentLandId = landId;
        void this.loadBoostCards(landId);
        this.slideTo(this.showY);
    }

    hide() {
        this.slideTo(this.hideY);
    }

    private slideTo(targetY: number) {
        tween(this.node).stop();
        const pos = this.node.position;
        tween(this.node)
            .to(this.duration, { position: new Vec3(pos.x, targetY, pos.z) }, { easing: 'cubicOut' })
            .start();
    }

    private onLandFocusChanged() {
        if (!this.currentLandId) return;
        this.hide();
        this.currentLandId = 0;
    }

    private async loadBoostCards(landId: number) {
        try {
            const landLevel = Storage.getNumber(this.pickerStorageKey, 1);
            this.latestResponse = await Api.landBoostCards({
                land_level: landLevel,
                land_id: landId,
            });
            this.renderCardList(this.pickCardList(this.latestResponse));
        } catch (error) {
            console.error('[Cards] 获取加速卡列表失败:', error);
        }
    }

    private pickCardList(response: Record<string, any> | null): BoostCardItem[] {
        if (!response) {
            return [];
        }

        if (Array.isArray(response.list)) {
            return response.list;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (Array.isArray(response.data?.list)) {
            return response.data.list;
        }

        return [];
    }

    private renderCardList(list: BoostCardItem[]) {
        if (!this.listContent || !this.cardPrefab) return;

        for (const child of [...this.listContent.children]) {
            child.destroy();
        }

        for (const item of list) {
            const node = instantiate(this.cardPrefab);
            node.active = true;
            this.listContent.addChild(node);
            void this.fillCardItem(node, item);
        }
    }

    private async fillCardItem(node: Node, item: BoostCardItem) {
        const countLabel = node.getChildByPath('number/count')?.getComponent(Label) ?? null;
        const nameLabel = node.getChildByName('name')?.getComponent(Label) ?? null;
        const cardSprite = node.getChildByPath('img/card')?.getComponent(Sprite) ?? null;

        if (countLabel) {
            countLabel.string = '1';
        }
        if (nameLabel) {
            nameLabel.string = String(item.name ?? '');
        }
        if (cardSprite) {
            cardSprite.spriteFrame = await this.loadCardIcon(Number(item.land_level ?? 0));
        }

        node.on(Node.EventType.TOUCH_END, () => {
            void this.onCardItemClick(item);
        }, this);
    }

    private async loadCardIcon(landLevel: number) {
        const resourcePath = Cards.CARD_ICON_PATHS[landLevel] ?? Cards.CARD_ICON_PATHS[0];
        const cached = Cards.iconCache.get(resourcePath);
        if (cached !== undefined) {
            return cached;
        }

        const spriteFrame = await new Promise<SpriteFrame | null>((resolve) => {
            resources.load(resourcePath, SpriteFrame, (error, asset) => {
                if (error) {
                    resolve(null);
                    return;
                }
                resolve(asset ?? null);
            });
        });
        Cards.iconCache.set(resourcePath, spriteFrame);
        return spriteFrame;
    }

    private async onCardItemClick(item: BoostCardItem) {
        const selectedLand = Land.currentSelected;
        const payload = this.buildUseBoostCardParams(item, selectedLand);
        if (!payload || !selectedLand) return;

        try {
            const response = await Api.landUseBoostCard(payload);
            const landInfo = this.pickLandInfo(response);
            if (!landInfo) {
                console.warn('[Cards] 使用加速卡成功，但未返回 land_info:', response);
                return;
            }

            this.applyLatestLandInfo(selectedLand, landInfo);
            this.hide();
            Toast.showSuccess(t('加速成功'));
        } catch (error) {
            console.error('[Cards] 使用加速卡失败:', error);
        }
    }

    private buildUseBoostCardParams(item: BoostCardItem, selectedLand: Land | null) {
        if (!selectedLand) {
            Toast.showFail(t('土地状态数据异常'));
            return null;
        }

        const boostCardId = Number(item.id ?? 0);
        const sowDetailId = Number(selectedLand.landData?.land_info?.id ?? 0);
        if (!Number.isFinite(boostCardId) || boostCardId <= 0 || !Number.isFinite(sowDetailId) || sowDetailId <= 0) {
            Toast.showFail(t('土地状态数据异常'));
            return null;
        }

        return {
            boost_card_id: boostCardId,
            sow_detail_id: sowDetailId,
        };
    }

    private pickLandInfo(response: Record<string, any>) {
        return response.land_info ?? response.data?.land_info ?? null;
    }

    private applyLatestLandInfo(targetLand: Land, landInfo: LandInfoData) {
        const latestLandData: LandListItem = {
            ...(targetLand.landData ?? {}),
            land_id: Number(landInfo.land_id ?? targetLand.landData?.land_id ?? this.currentLandId),
            land_info: landInfo,
        };
        targetLand.setLandData(latestLandData);
    }
}
