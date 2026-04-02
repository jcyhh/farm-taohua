import { _decorator, Component, director, Label, Node, ProgressBar, Sprite, tween, Vec3 } from 'cc';
import { Api, LandDetailResponse, LandInfo as LandInfoData, LandListItem } from '../Config/Api';
import { t } from '../Config/I18n';
import { UiHeadbar } from './UiHeadbar';
import { LAND_FOCUS_CHANGED_EVENT, Land } from '../Prefab/Land';
import { RemoteSpriteCache } from '../Utils/RemoteSpriteCache';
const { ccclass, property } = _decorator;

@ccclass('LandInfo')
export class LandInfo extends Component {
    private static _instance: LandInfo | null = null;

    @property({ tooltip: '动画时长(秒)' })
    duration = 0.25;

    @property({ tooltip: '土地等级缓存 key' })
    pickerStorageKey = 'popup_picker_value';

    private readonly hideY = -253;
    private readonly showY = 92;
    private isTweening = false;
    private currentLand: Land | null = null;
    private currentLandInfo: LandInfoData | null = null;
    private requestVersion = 0;
    private hasHandledCountdownFinish = false;

    private plantNode: Node | null = null;
    private plantSprite: Sprite | null = null;
    private nameLabel: Label | null = null;
    private statusLabel: Label | null = null;
    private timeNode: Node | null = null;
    private timeLabel: Label | null = null;
    private progressBar: ProgressBar | null = null;
    private progressLabel: Label | null = null;
    private yieldProgressBar: ProgressBar | null = null;
    private yieldProgressLabel: Label | null = null;
    private countNode: Node | null = null;
    private countLabel: Label | null = null;

    static get instance(): LandInfo | null {
        return LandInfo._instance;
    }

    onLoad() {
        LandInfo._instance = this;
        director.on(LAND_FOCUS_CHANGED_EVENT, this.onLandFocusChanged, this);
        const pos = this.node.position;
        this.node.setPosition(pos.x, this.hideY, pos.z);
        this.plantNode = this.node.getChildByName('plant');
        this.plantSprite = this.node.getChildByPath('plant/img/plant')?.getComponent(Sprite) ?? null;
        this.nameLabel = this.node.getChildByPath('plant/name')?.getComponent(Label) ?? null;
        this.statusLabel = this.node.getChildByName('status')?.getComponent(Label) ?? null;
        this.timeNode = this.node.getChildByName('time');
        this.timeLabel = this.timeNode?.getComponent(Label) ?? null;
        this.progressBar = this.node.getChildByPath('progress/Node/ProgressBar')?.getComponent(ProgressBar)
            ?? this.node.getChildByName('ProgressBar')?.getComponent(ProgressBar)
            ?? null;
        this.progressLabel = this.node.getChildByPath('progress/Node/progress')?.getComponent(Label)
            ?? this.node.getChildByName('progress')?.getComponent(Label)
            ?? null;
        this.yieldProgressBar = this.node.getChildByPath('progress/Node-001/ProgressBar')?.getComponent(ProgressBar) ?? null;
        this.yieldProgressLabel = this.node.getChildByPath('progress/Node-001/progress')?.getComponent(Label) ?? null;
        this.countNode = this.node.getChildByName('count');
        this.countLabel = this.countNode?.getComponent(Label) ?? null;
    }

    onDestroy() {
        if (LandInfo._instance === this) {
            LandInfo._instance = null;
        }
        this.unschedule(this.updateCountdown);
        director.off(LAND_FOCUS_CHANGED_EVENT, this.onLandFocusChanged, this);
    }

    private onLandFocusChanged(land: Land | null) {
        if (!land) {
            this.currentLand = null;
            this.currentLandInfo = null;
            this.hasHandledCountdownFinish = false;
            this.unschedule(this.updateCountdown);
            this.hide();
            return;
        }

        this.currentLand = land;
        this.show();
        void this.loadLandInfo(land);
    }

    private show() {
        this.slideTo(this.showY);
    }

    private hide() {
        this.slideTo(this.hideY);
    }

    private slideTo(targetY: number) {
        tween(this.node).stop();
        this.isTweening = true;
        const pos = this.node.position;
        tween(this.node)
            .to(this.duration, { position: new Vec3(pos.x, targetY, pos.z) }, { easing: 'cubicOut' })
            .call(() => { this.isTweening = false; })
            .start();
    }

    private async loadLandInfo(land: Land) {
        const landId = land.getRequestLandId(this.pickerStorageKey);
        if (!landId) {
            console.error('[LandInfo] 土地ID计算失败');
            return;
        }

        const requestVersion = ++this.requestVersion;
        try {
            const response = await Api.landInfo(landId);
            if (this.currentLand !== land || requestVersion !== this.requestVersion) return;
            const landInfo = this.pickLandInfo(response);
            if (!landInfo) {
                console.warn('[LandInfo] 土地详情未返回 land_info:', response);
                return;
            }

            this.currentLandInfo = landInfo;
            const latestLandData: LandListItem = {
                ...(land.landData ?? {}),
                land_id: landId,
                land_info: landInfo,
            };
            land.setLandData(latestLandData);
            this.renderLandInfo(landInfo);
        } catch (error) {
            console.error('[LandInfo] 获取土地详情失败:', error);
        }
    }

    private pickLandInfo(response: LandDetailResponse): LandInfoData | null {
        if (response.land_info) {
            return response.land_info;
        }
        if (response.data && !Array.isArray(response.data)) {
            return 'land_info' in response.data ? (response.data.land_info ?? null) : response.data;
        }
        return null;
    }

    private renderLandInfo(landInfo: LandInfoData) {
        const status = Number(landInfo.status ?? 0);
        this.nameLabel && (this.nameLabel.string = String(landInfo.seed_name ?? ''));
        this.statusLabel && (this.statusLabel.string = this.getStatusText(status));

        const cycle = Number(landInfo.cycle ?? 0);
        const ripeDay = Number(landInfo.ripe_day ?? 0);
        const progress = cycle > 0 ? Math.max(0, Math.min(1, ripeDay / cycle)) : 0;
        if (this.progressBar) {
            this.progressBar.progress = progress;
        }
        if (this.progressLabel) {
            this.progressLabel.string = t('{ripeDay}/{cycle}天', { ripeDay, cycle });
        }

        const ripeYield = Number(landInfo.ripe_yield ?? 0);
        const countYield = Number(landInfo.count_yield ?? 0);
        const yieldProgress = countYield > 0 ? Math.max(0, Math.min(1, ripeYield / countYield)) : 0;
        if (this.yieldProgressBar) {
            this.yieldProgressBar.progress = yieldProgress;
        }
        if (this.yieldProgressLabel) {
            this.yieldProgressLabel.string = t('{ripeYield}/{countYield}桃花果', { ripeYield, countYield });
        }

        if (this.countNode) {
            this.countNode.active = status === 3;
        }
        if (this.countLabel) {
            const currentRipeYield = Number(landInfo.this_ripe_yield ?? landInfo.ripe_yield ?? 0);
            this.countLabel.string = status === 3 ? t('可采摘{count}桃花果', { count: currentRipeYield }) : '';
        }

        if (this.timeNode) {
            this.timeNode.active = status === 2;
        }
        this.hasHandledCountdownFinish = false;
        this.unschedule(this.updateCountdown);
        if (status === 2) {
            this.updateCountdown();
            this.schedule(this.updateCountdown, 1);
        } else if (this.timeLabel) {
            this.timeLabel.string = '';
        }

        void this.loadPlantSprite(String(landInfo.ripe_img ?? ''));
    }

    applyLatestLandInfo(land: Land, landInfo: LandInfoData) {
        if (this.currentLand !== land) return;
        this.currentLandInfo = landInfo;
        this.renderLandInfo(landInfo);
    }

    private updateCountdown = () => {
        if (!this.timeLabel || !this.currentLandInfo) return;
        const remainingMs = this.getRemainingMs(this.currentLandInfo.next_ripe_time);
        if (remainingMs <= 0) {
            this.timeLabel.string = t('{time}后成熟', { time: '00:00:00' });
            this.unschedule(this.updateCountdown);
            if (!this.hasHandledCountdownFinish) {
                this.hasHandledCountdownFinish = true;
                void UiHeadbar.refreshUserInfo();
            }
            return;
        }
        this.timeLabel.string = t('{time}后成熟', { time: this.formatDuration(remainingMs) });
    };

    private getStatusText(status: number) {
        switch (status) {
            case 1: return t('待浇水');
            case 2: return t('成长中');
            case 3: return t('待采摘');
            case 4: return t('枯萎待铲除');
            default: return '';
        }
    }

    private getRemainingMs(nextRipeTime?: string) {
        const target = this.parseChinaDate(nextRipeTime);
        if (!target) return 0;
        return Math.max(0, target.getTime() - Date.now());
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

    private formatDuration(remainingMs: number) {
        const totalSeconds = Math.floor(remainingMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [hours, minutes, seconds].map((value) => this.pad2(value)).join(':');
    }

    private pad2(value: number) {
        return value < 10 ? `0${value}` : String(value);
    }

    private async loadPlantSprite(url: string) {
        if (!this.plantSprite?.isValid) return;

        if (!url) {
            this.plantSprite.spriteFrame = null;
            return;
        }

        try {
            const spriteFrame = await RemoteSpriteCache.load(url);
            if (!spriteFrame?.isValid || !this.plantSprite?.isValid) return;
            this.plantSprite.spriteFrame = spriteFrame;
        } catch (error) {
            console.error(`[LandInfo] 加载植物图片失败: ${url}`, error);
        }
    }
}

