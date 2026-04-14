import { _decorator, Component, director, EventTouch, Label, Node, Sprite, UITransform, Vec2 } from 'cc';
import { Api, TreeBattleInvitePollResponse, TreeBattleInviteReceivedItem, TreeBattleInviteReceivedResponse } from '../Config/Api';
import { Toast } from '../Common/Toast';
import { formatAmount } from '../Utils/Format';
import { BattleBoxSelector } from './BattleBoxSelector';
import { BattleMatchTimers } from './BattleMatchTimers';
import { BattleFlowStatus, BattleStepFlow, BATTLE_HEADBAR_QUIT_EVENT, BATTLE_SHOW_STEP1_EVENT } from './BattleStepFlow';
import { FightResultStore } from '../Fight/FightResultStore';
import { PopupReview } from './PopupReview';
import { UserProfileStore } from './UserProfileStore';
import { AudioManager } from '../Manager/AudioManager';
import { t } from '../Config/I18n';

const { ccclass, property } = _decorator;
const DEFAULT_BOX_NAME = 'box1';
const RECEIVED_INVITE_POLL_INTERVAL = 3;
const MANUAL_INVITE_POLL_INTERVAL = 3;
const FIGHT_SCENE_NAME = 'Fight';
const LOG_SCENE_NAME = 'Log';

@ccclass('MapRoot')
export class MapRoot extends Component {
    private static _instance: MapRoot | null = null;

    @property({ type: Label, tooltip: '灵石数量文本，拖拽 step1/assetStone/Label 到这里' })
    fairyStoneLabel: Label | null = null;

    @property({ type: Label, tooltip: '自动匹配计时文本，拖拽 step2/step2-2/time 到这里' })
    step2TimeLabel: Label | null = null;

    @property({ type: Label, tooltip: '指定邀请倒计时文本，拖拽 step2/step2-3/time 到这里' })
    step2ManualTimeLabel: Label | null = null;

    @property({ type: Label, tooltip: '指定邀请提示文本，拖拽 step2/step2-3/message/Label 到这里' })
    step2ManualMessageLabel: Label | null = null;

    @property({ type: Node, tooltip: '收到邀请弹窗节点，拖拽 popupReview 到这里' })
    popupReviewNode: Node | null = null;

    private parentTransform: UITransform | null = null;
    private selfTransform: UITransform | null = null;
    private minScale = 1;
    private _touchStartPos = new Vec2();
    private stepFlow: BattleStepFlow | null = null;
    private boxSelector: BattleBoxSelector | null = null;
    private matchTimers: BattleMatchTimers | null = null;
    private popupReview: PopupReview | null = null;
    private currentReviewInviteId: number | string | null = null;
    private manualInvitePollInFlight = false;
    private leavingHomeScene = false;
    private readonly receivedInvitePollTimer = async () => {
        await this.pollReceivedInvite();
    };
    private readonly manualInvitePollTimer = async () => {
        await this.pollManualInviteResult();
    };

    static get instance(): MapRoot | null {
        return MapRoot._instance;
    }

    onLoad() {
        MapRoot._instance = this;
        this.leavingHomeScene = false;
        this.parentTransform = this.node.parent?.getComponent(UITransform) ?? null;
        this.selfTransform = this.node.getComponent(UITransform);
        this.minScale = this.node.scale.x;
        this.node.setScale(this.minScale, this.minScale, 1);
        this.stepFlow = new BattleStepFlow(this.node);
        this.boxSelector = new BattleBoxSelector(
            this.stepFlow.getStep1Node(),
            this.stepFlow.getStep2BoxSpriteNode()?.getComponent(Sprite) ?? null,
        );
        this.matchTimers = new BattleMatchTimers(
            this,
            this.step2TimeLabel,
            this.step2ManualTimeLabel,
            this.step2ManualMessageLabel,
        );
        this.popupReviewNode = this.popupReviewNode ?? this.node.getChildByName('popupReview') ?? null;
        this.popupReview = this.popupReviewNode?.getComponent(PopupReview) ?? null;

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        director.on(BATTLE_SHOW_STEP1_EVENT, this.showStep1, this);
        director.on(BATTLE_HEADBAR_QUIT_EVENT, this.onHeadbarQuit, this);
        this.clampPosition();
    }

    start() {
        this.preloadScene(FIGHT_SCENE_NAME);
        this.preloadScene(LOG_SCENE_NAME);
        this.boxSelector?.selectBox(DEFAULT_BOX_NAME);
        if (this.isStep1Active()) {
            void this.refreshStep1Data();
        }
        this.updateReceivedInvitePolling();
    }

    onDestroy() {
        this.leavingHomeScene = true;
        if (MapRoot._instance === this) {
            MapRoot._instance = null;
        }
        this.matchTimers?.destroy();
        this.stepFlow?.destroy();
        this.stopReceivedInvitePolling();
        this.stopManualInvitePolling();
        director.off(BATTLE_SHOW_STEP1_EVENT, this.showStep1, this);
        director.off(BATTLE_HEADBAR_QUIT_EVENT, this.onHeadbarQuit, this);
        this.safeOff(this.node, Node.EventType.TOUCH_START, this.onTouchStart);
        this.safeOff(this.node, Node.EventType.TOUCH_MOVE, this.onTouchMove);
        this.safeOff(this.node, Node.EventType.TOUCH_END, this.onTouchEnd);
        this.safeOff(this.node, Node.EventType.TOUCH_CANCEL, this.onTouchEnd);
    }

    onExternalTouchStart(event: EventTouch) {
        this.onTouchStart(event);
    }

    onExternalTouchMove(event: EventTouch) {
        this.onTouchMove(event);
    }

    onExternalTouchEnd(event: EventTouch) {
        this.onTouchEnd(event);
    }

    onBoxSelect(_event?: Event, customEventData?: string) {
        const boxName = customEventData?.trim();
        if (!boxName) {
            return;
        }
        this.boxSelector?.selectBox(boxName);
    }

    onShowStep1() {
        AudioManager.instance?.playClick();
        this.showStep1();
    }

    onShowStep2() {
        AudioManager.instance?.playClick();
        this.showStep2();
    }

    onStep2AutoMatch() {
        AudioManager.instance?.playClick();
        this.showStep2AutoMatch();
    }

    onStep2ManualMatch() {
        AudioManager.instance?.playClick();
        this.showStep2ManualMatch();
    }

    onOpenLogScene() {
        AudioManager.instance?.playClick();
        this.enterLogScene();
    }

    onBackToStep2Main() {
        AudioManager.instance?.playClick();
        this.matchTimers?.stopAutoMatch();
        this.showStep2();
    }

    async onBackFromStep2ManualMatch() {
        AudioManager.instance?.playClick();
        const inviteId = this.matchTimers?.getManualInviteId();
        if (inviteId) {
            try {
                await Api.treeBattleInviteCancel(inviteId);
            } catch (error) {
                console.error('[MapRoot] 取消邀请失败:', error);
                return;
            }
        }

        this.stopManualInvitePolling();
        this.matchTimers?.stopManualMatch();
        this.showStep2();
    }

    showStep1() {
        this.stopManualInvitePolling();
        this.matchTimers?.stopAutoMatch();
        this.matchTimers?.stopManualMatch();
        this.stepFlow?.showStep1();
        this.updateReceivedInvitePolling();
        void this.refreshStep1Data();
    }

    showStep2() {
        this.stopManualInvitePolling();
        this.matchTimers?.stopAutoMatch();
        this.matchTimers?.stopManualMatch();
        this.stepFlow?.showStep2();
        this.updateReceivedInvitePolling();
    }

    showStep2AutoMatch() {
        this.stopManualInvitePolling();
        this.matchTimers?.stopManualMatch();
        this.stepFlow?.showStep2AutoMatch();
        this.updateReceivedInvitePolling();
        this.matchTimers?.startAutoMatch(() => this.onStep2AutoMatchFinished());
    }

    showStep2ManualMatch() {
        this.matchTimers?.stopAutoMatch();
        this.stepFlow?.showStep2ManualMatch();
        this.updateReceivedInvitePolling();
    }

    startStep2ManualMatchFlow(phone: string, inviteId?: number | string) {
        this.showStep2ManualMatch();
        this.matchTimers?.startManualMatch(
            phone,
            inviteId ?? '',
            () => this.onStep2ManualMatchFinished(),
        );
        this.startManualInvitePolling();
    }

    isStep1Active() {
        return this.stepFlow?.isStep1Active() ?? true;
    }

    getBattleStatus() {
        return this.stepFlow?.getStatus() ?? BattleFlowStatus.IDLE;
    }

    setBattleGaming(active: boolean) {
        this.stepFlow?.setGaming(active);
        this.updateReceivedInvitePolling();
    }

    getSelectedBoxAmount() {
        return this.boxSelector?.getSelectedBoxAmount() ?? 0;
    }

    getSelectedBoxName() {
        return this.boxSelector?.getSelectedBoxName() ?? DEFAULT_BOX_NAME;
    }

    private onTouchStart(event: EventTouch) {
        this._touchStartPos.set(event.getUILocation());
    }

    private onTouchMove(event: EventTouch) {
        const touches = event.getTouches();
        if (touches.length >= 2) {
            return;
        }

        const delta = event.getUIDelta();
        this.node.setPosition(
            0,
            this.clampY(this.node.position.y + delta.y),
            this.node.position.z,
        );
    }

    private onTouchEnd(event: EventTouch) {
        void event;
    }

    private async refreshStep1Data() {
        try {
            const userInfo = await UserProfileStore.refresh();
            if (this.fairyStoneLabel?.isValid && userInfo) {
                this.fairyStoneLabel.string = formatAmount(userInfo.balance_fairy_stone);
            }
        } catch (error) {
            console.error('[MapRoot] 获取用户信息失败:', error);
        }

        try {
            const response = await Api.treeBattleAmount();
            this.boxSelector?.renderBoxAmounts(this.pickTreeBattleAmounts(response));
        } catch (error) {
            console.error('[MapRoot] 获取斗法数量失败:', error);
        }
    }

    private pickTreeBattleAmounts(response: any): Array<number | string> {
        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response?.list)) {
            return response.list;
        }

        if (Array.isArray(response?.amount)) {
            return response.amount;
        }

        if (Array.isArray(response?.data)) {
            return response.data;
        }

        if (response?.data && !Array.isArray(response.data)) {
            if (Array.isArray(response.data.list)) {
                return response.data.list;
            }
            if (Array.isArray(response.data.amount)) {
                return response.data.amount;
            }
        }

        return [];
    }

    private onStep2AutoMatchFinished() {
        void this.startAutoMatchFight();
    }

    private onStep2ManualMatchFinished() {
        this.stopManualInvitePolling();
        Toast.showFail(t('邀请已超时'));
        this.showStep2();
    }

    private async onHeadbarQuit() {
        if (this.stepFlow?.isStep2ManualMatchActive()) {
            await this.onBackFromStep2ManualMatch();
            return;
        }
        this.showStep1();
    }

    private updateReceivedInvitePolling() {
        if (!this.stepFlow?.isIdle()) {
            this.currentReviewInviteId = null;
            this.stopReceivedInvitePolling();
            return;
        }
        this.startReceivedInvitePolling();
    }

    private startReceivedInvitePolling() {
        this.unschedule(this.receivedInvitePollTimer);
        this.schedule(this.receivedInvitePollTimer, RECEIVED_INVITE_POLL_INTERVAL);
    }

    private stopReceivedInvitePolling() {
        this.unschedule(this.receivedInvitePollTimer);
    }

    private startManualInvitePolling() {
        this.stopManualInvitePolling();
        this.schedule(this.manualInvitePollTimer, MANUAL_INVITE_POLL_INTERVAL);
    }

    private stopManualInvitePolling() {
        this.manualInvitePollInFlight = false;
        this.unschedule(this.manualInvitePollTimer);
    }

    private async pollReceivedInvite() {
        if (this.leavingHomeScene || !this.stepFlow?.isIdle()) {
            return;
        }
        if (!this.popupReview?.isValid) {
            return;
        }

        try {
            const response = await Api.treeBattleInviteReceived();
            if (this.leavingHomeScene || !this.isValid || !this.stepFlow?.isIdle()) {
                return;
            }

            const inviteList = this.pickReceivedInviteList(response);
            const currentInviteId = this.currentReviewInviteId;
            const currentInvite = currentInviteId
                ? inviteList.filter((inviteItem) => inviteItem?.id === currentInviteId)[0] ?? null
                : null;

            if (this.popupReview.node.active) {
                if (currentInviteId && currentInvite) {
                    return;
                }
                if (currentInviteId && !currentInvite) {
                    this.currentReviewInviteId = null;
                    this.popupReview.hidePopup();
                    Toast.showFail(t('对方取消了邀请'));
                }
                return;
            }

            const invite = inviteList[0] ?? null;
            if (!invite) {
                this.currentReviewInviteId = null;
                return;
            }
            if (invite.id && this.currentReviewInviteId === invite.id) {
                return;
            }
            this.showReceivedInvitePopup(invite);
        } catch (error) {
            console.error('[MapRoot] 轮询收到邀请失败:', error);
        }
    }

    private async pollManualInviteResult() {
        if (this.leavingHomeScene) {
            this.stopManualInvitePolling();
            return;
        }
        const inviteId = this.matchTimers?.getManualInviteId();
        if (!inviteId) {
            this.stopManualInvitePolling();
            return;
        }
        if (!this.stepFlow?.isStep2ManualMatchActive()) {
            this.stopManualInvitePolling();
            return;
        }
        if (this.manualInvitePollInFlight) {
            return;
        }

        this.manualInvitePollInFlight = true;
        try {
            const response = await Api.treeBattleInvitePoll(inviteId);
            if (this.leavingHomeScene || !this.isValid || !this.stepFlow?.isStep2ManualMatchActive()) {
                return;
            }
            await this.handleManualInvitePollResult(response);
        } catch (error) {
            console.error('[MapRoot] 轮询主动邀请结果失败:', error);
        } finally {
            this.manualInvitePollInFlight = false;
        }
    }

    private async handleManualInvitePollResult(response: TreeBattleInvitePollResponse) {
        const status = this.pickManualInvitePollStatus(response);
        if (status === 0 || status === null) {
            return;
        }

        this.stopManualInvitePolling();
        this.matchTimers?.stopManualMatch();

        if (status === 1) {
            this.rememberFightResultAndEnter(
                this.pickManualInvitePollGame(response) ?? response,
                this.getBoxNameByAmount(this.pickManualInvitePollAmount(response)),
            );
            return;
        }

        if (status === 2) {
            Toast.showFail(t('对方已拒绝邀请'));
            this.showStep2();
            return;
        }

        if (status === 3) {
            Toast.showFail(t('邀请已取消'));
            this.showStep2();
        }
    }

    private showReceivedInvitePopup(invite: TreeBattleInviteReceivedItem) {
        this.currentReviewInviteId = invite.id ?? null;
        this.popupReview?.showInviteReview(invite, {
            onReject: this.onRejectReceivedInvite,
            onAccept: this.onAcceptReceivedInvite,
        });
    }

    private readonly onRejectReceivedInvite = async (invite: TreeBattleInviteReceivedItem | null) => {
        const inviteId = invite?.id;
        if (!inviteId) {
            Toast.showFail(t('邀请ID无效'));
            return false;
        }

        try {
            await Api.treeBattleInviteReject(inviteId);
            this.currentReviewInviteId = null;
            return true;
        } catch (error) {
            console.error('[MapRoot] 拒绝收到的邀请失败:', error);
            Toast.showFail(t('拒绝邀请失败'));
            return false;
        }
    };

    private readonly onAcceptReceivedInvite = async (invite: TreeBattleInviteReceivedItem | null) => {
        const inviteId = invite?.id;
        if (!inviteId) {
            Toast.showFail(t('邀请ID无效'));
            return false;
        }

        try {
            const response = await Api.treeBattleInviteAccept(inviteId);
            this.currentReviewInviteId = null;
            this.rememberFightResultAndEnter(response, this.getReceivedInviteBoxName(invite));
            return true;
        } catch (error) {
            console.error('[MapRoot] 接受收到的邀请失败:', error);
            Toast.showFail(t('接受邀请失败'));
            return false;
        }
    };

    private pickFirstReceivedInvite(response: TreeBattleInviteReceivedResponse) {
        return this.pickReceivedInviteList(response)[0] ?? null;
    }

    private pickReceivedInviteList(response: TreeBattleInviteReceivedResponse) {
        if (Array.isArray(response)) {
            return response;
        }
        if (Array.isArray(response?.list)) {
            return response.list;
        }
        if (Array.isArray(response?.data)) {
            return response.data;
        }
        if (response?.data && !Array.isArray(response.data) && Array.isArray(response.data.list)) {
            return response.data.list;
        }
        return [];
    }

    private pickManualInvitePollStatus(response: TreeBattleInvitePollResponse) {
        if (typeof response?.status === 'number') {
            return response.status;
        }
        if (typeof response?.data?.status === 'number') {
            return response.data.status;
        }
        return null;
    }

    private async startAutoMatchFight() {
        if (this.leavingHomeScene || !this.stepFlow?.isMatching()) {
            return;
        }

        const amount = this.getSelectedBoxAmountNumber();
        if (!Number.isFinite(amount) || amount <= 0) {
            Toast.showFail(t('下注金额无效'));
            this.showStep2();
            return;
        }

        try {
            const response = await Api.treeBattleFight({ amount });
            this.rememberFightResultAndEnter(response);
        } catch (error) {
            console.error('[MapRoot] 自动匹配开战失败:', error);
            Toast.showFail(t('自动匹配失败'));
            this.showStep2();
        }
    }

    private getSelectedBoxAmountNumber() {
        return Number(String(this.getSelectedBoxAmount()).replace(/,/g, ''));
    }

    private rememberFightResultAndEnter(response: any, selectedBoxName?: string | null) {
        FightResultStore.saveFromResponse(response, {
            selected_box_name: selectedBoxName || this.getSelectedBoxName(),
        });
        this.enterFightScene();
    }

    private getReceivedInviteBoxName(invite: TreeBattleInviteReceivedItem | null) {
        return this.getBoxNameByAmount(invite?.amount);
    }

    private getBoxNameByAmount(amount: number | string | null | undefined) {
        const boxName = this.boxSelector?.getBoxNameByAmount(amount);
        if (boxName) {
            return boxName;
        }
        return this.getSelectedBoxName();
    }

    private pickManualInvitePollAmount(response: TreeBattleInvitePollResponse) {
        if (response?.amount !== undefined) {
            return response.amount;
        }
        if (response?.data?.amount !== undefined) {
            return response.data.amount;
        }
        return undefined;
    }

    private pickManualInvitePollGame(response: TreeBattleInvitePollResponse) {
        if (response?.game && typeof response.game === 'object' && !Array.isArray(response.game)) {
            return response.game;
        }
        if (response?.data?.game && typeof response.data.game === 'object' && !Array.isArray(response.data.game)) {
            return response.data.game;
        }
        return null;
    }

    private enterFightScene() {
        if (this.leavingHomeScene) {
            return;
        }
        this.leavingHomeScene = true;
        this.stopManualInvitePolling();
        this.stopReceivedInvitePolling();
        this.matchTimers?.stopAutoMatch(false);
        this.matchTimers?.stopManualMatch(false);
        this.setBattleGaming(true);
        director.loadScene(FIGHT_SCENE_NAME);
    }

    private enterLogScene() {
        if (this.leavingHomeScene) {
            return;
        }
        this.leavingHomeScene = true;
        this.stopManualInvitePolling();
        this.stopReceivedInvitePolling();
        this.matchTimers?.stopAutoMatch(false);
        this.matchTimers?.stopManualMatch(false);
        director.loadScene(LOG_SCENE_NAME);
    }

    private preloadScene(sceneName: string) {
        director.preloadScene(sceneName, (error) => {
            if (error) {
                console.error(`[MapRoot] 预加载 ${sceneName} 场景失败:`, error);
            }
        });
    }

    private clampPosition() {
        this.node.setPosition(
            0,
            this.clampY(this.node.position.y),
            this.node.position.z,
        );
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

    private safeOff(node: Node | null | undefined, eventType: string, callback: (...args: any[]) => void) {
        const target = node as any;
        if (!target?.isValid || !target._eventProcessor) {
            return;
        }
        target.off(eventType, callback, this);
    }
}
