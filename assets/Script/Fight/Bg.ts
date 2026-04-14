import { _decorator, Animation, Component, director, EventTouch, Label, Node, resources, Sprite, SpriteFrame, tween, UITransform, Vec3 } from 'cc';
import { AudioManager } from '../Manager/AudioManager';
import { Role } from '../Prefab/Role';
import { FightResultStore } from './FightResultStore';
import { PopupResult } from './PopupResult';

const { ccclass, property } = _decorator;
const PLAYER_NODE_NAMES = ['player1', 'player2'];
const PLAYER_ROLE_NODE_NAMES = ['playerRole1', 'playerRole2'];
const PLAYER_RESULT_KEYS = ['player1', 'player2'];
const BOX_NODE_NAMES = ['box1', 'box2', 'box3', 'box4', 'box5'];
const ROLE_NODE_NAMES = ['role1', 'role2', 'role3', 'role4', 'role5'];
const DEFAULT_BOX_NAME = 'box1';
const BOX_ENTRY_OFFSET_Y = 80;
const BOX_ENTRY_SCALE = 0;
const BOX_ENTRY_DURATION = 0.44;
const BOX_ENTRY_STAGGER = 0.1;
const BOX_SHAKE_REPEAT_TIMES = 1;
const ROLE_MOTION_SLOW_SCALE = 1.5;
const ATTACK_FIGHT_REPEAT_TIMES = 2;
const ROLE_ENTRY_DURATION = 0.2 * ROLE_MOTION_SLOW_SCALE;
const ROLE_ENTRY_STAGGER = 0.04 * ROLE_MOTION_SLOW_SCALE;
const ROLE_MERGE_MOVE_DURATION = 0.2 * ROLE_MOTION_SLOW_SCALE;
const ROLE_COMPACT_MOVE_DURATION = 0.2 * ROLE_MOTION_SLOW_SCALE;
const PLAYER_ROLE_STAGE_MOVE_DURATION = 0.3 * ROLE_MOTION_SLOW_SCALE;
const PLAYER_ROLE_STAGE_TARGET_Y: Record<string, number> = {
    playerRole2: -120,
    playerRole1: -390,
};
const PLAYER_ROLE_ATTACK_RISE_DURATION = 0.12 * ROLE_MOTION_SLOW_SCALE;
const PLAYER_ROLE_ATTACK_RETURN_DURATION = 0.16 * ROLE_MOTION_SLOW_SCALE;
const PLAYER_ROLE_ATTACK_OFFSET_Y = 100;
const PLAYER_ROLE_HIT_SHAKE_OFFSET_X = 16;
const PLAYER_ROLE_HIT_SHAKE_STEP_DURATION = 0.1;
const PLAYER_ROLE_FIGHT_FALLBACK_DURATION = 0.6 * ROLE_MOTION_SLOW_SCALE;
const PLAYER_ROLE_DEATH_SCALE_DURATION = 0.2 * ROLE_MOTION_SLOW_SCALE;
const DEFAULT_ATTACKER_ROLE_ROOT = 'playerRole1';
const SMALL_MERGED_ROLE_ID = 11;
const BIG_MERGED_ROLE_ID = 12;
const PLAYER_MANUAL_OPEN_SECONDS = 10;

interface BoxDisplayEntry {
    node: Node;
    playerNodeName: string;
    boxNodeName: string;
    slotIndex: number;
    isOpened: boolean;
    isOpening: boolean;
    openingTask: Promise<void> | null;
    touchHandler: ((event: EventTouch) => void) | null;
}

interface RoleDisplayEntry {
    node: Node;
    spiritId: number;
    slotIndex: number;
}

interface RoleSlotState {
    position: Vec3;
    scale: Vec3;
}

interface PlayerRoleRenderContext {
    playerNodeName: string;
    playerRoleRoot: Node;
    slotStates: RoleSlotState[];
    currentEntries: RoleDisplayEntry[];
    resultType: number;
    resultData: Record<string, any> | null;
    isMe: boolean;
}

interface AttackStageConfig {
    attackerRootName: string;
    defenderRootName: string;
    attackerOffsetY: number;
}

interface AttackStageStep extends AttackStageConfig {
    defenderTargetPercent: number;
    shouldDefenderDie: boolean;
}

type MergeSfxType = 'upgrade' | 'upgrade1' | 'upgrade2';
type MergeDirection = 'left' | 'right';

interface MergeSequenceResult {
    currentEntries: RoleDisplayEntry[];
}

@ccclass('Bg')
export class Bg extends Component {
    @property({ type: PopupResult, tooltip: '结果弹窗组件，拖拽 PopupRoot/popupResult 到这里' })
    popupResult: PopupResult | null = null;

    @property({ type: Label, tooltip: '手动开箱倒计时文本，拖拽对应 Label 到这里' })
    manualOpenCountdownLabel: Label | null = null;

    private parentTransform: UITransform | null = null;
    private selfTransform: UITransform | null = null;
    /** 本轮 10 个宝箱同时开箱时只播一次 open 音效 */
    private boxOpenSoundPlayed = false;
    private manualOpenRemainingSeconds = PLAYER_MANUAL_OPEN_SECONDS;
    private manualOpenStageActive = false;
    private manualOpenStageResolved = false;
    private manualOpenStageResolver: (() => void) | null = null;
    private manualPlayerBoxEntries: BoxDisplayEntry[] = [];
    private manualPlayerRoleContexts: PlayerRoleRenderContext[] = [];
    private manualOpenedSpriteFrame: SpriteFrame | null = null;

    onLoad() {
        this.parentTransform = this.node.parent?.getComponent(UITransform) ?? null;
        this.selfTransform = this.node.getComponent(UITransform);

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        this.clampPosition();
        this.hideManualOpenCountdown();
    }

    start() {
        director.preloadScene('Home');
        void this.renderSelectedBoxes();
    }

    onDestroy() {
        this.safeOff(this.node, Node.EventType.TOUCH_START, this.onTouchStart);
        this.safeOff(this.node, Node.EventType.TOUCH_MOVE, this.onTouchMove);
        this.safeOff(this.node, Node.EventType.TOUCH_END, this.onTouchEnd);
        this.safeOff(this.node, Node.EventType.TOUCH_CANCEL, this.onTouchEnd);
        this.clearManualOpenStage();
    }

    private onTouchStart(_event: EventTouch) {
        // 预留触摸开始钩子，保持和 Home 拖动交互一致
    }

    private onTouchMove(event: EventTouch) {
        if (this.manualOpenStageActive) {
            return;
        }
        if (event.getTouches().length >= 2) {
            return;
        }

        const delta = event.getUIDelta();
        this.node.setPosition(
            0,
            this.clampY(this.node.position.y + delta.y),
            this.node.position.z
        );
    }

    private onTouchEnd(_event: EventTouch) {
        // 预留触摸结束钩子，当前无需额外处理
    }

    private clampPosition() {
        this.node.setPosition(
            0,
            this.clampY(this.node.position.y),
            this.node.position.z
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

    private async renderSelectedBoxes() {
        const fightResult = FightResultStore.getCurrent();
        if (!fightResult) {
            console.warn('[Bg] 缺少对战结果数据，已中止 Fight 流程');
            return;
        }
        const boxName = this.normalizeBoxName(fightResult?.selected_box_name);
        const closedSpriteFrame = await this.loadBoxSpriteFrame(boxName);
        const openedSpriteFrame = await this.loadBoxSpriteFrame(this.toOpenedBoxName(boxName));
        if (!closedSpriteFrame || !openedSpriteFrame || !this.node.isValid) {
            return;
        }

        this.setPlayerRoleVisible(false);
        this.setPlayerBoxesVisible(true);
        const boxNodes: Node[] = [];
        const playerBoxEntries: Record<string, BoxDisplayEntry[]> = {
            player1: [],
            player2: [],
        };
        for (const playerNodeName of PLAYER_NODE_NAMES) {
            const playerNode = this.node.getChildByName(playerNodeName);
            if (!playerNode) {
                continue;
            }

            for (const boxNodeName of BOX_NODE_NAMES) {
                const boxNode = playerNode.getChildByName(boxNodeName) ?? null;
                const sprite = boxNode?.getComponent(Sprite) ?? null;
                if (!sprite) {
                    continue;
                }
                sprite.spriteFrame = closedSpriteFrame;
                if (boxNode) {
                    boxNodes.push(boxNode);
                    playerBoxEntries[playerNodeName].push({
                        node: boxNode,
                        playerNodeName,
                        boxNodeName,
                        slotIndex: BOX_NODE_NAMES.indexOf(boxNodeName),
                        isOpened: false,
                        isOpening: false,
                        openingTask: null,
                        touchHandler: null,
                    });
                }
            }
        }

        await this.playBoxEntryAnimation(boxNodes);
        const playerRoleContexts = await this.renderPlayerRoleSprites(fightResult);
        this.prepareRoleRevealStage(playerRoleContexts);
        this.startBoxLoopAnimations(boxNodes);
        await this.runPlayer1ManualOpenStage(playerBoxEntries.player1, openedSpriteFrame, playerRoleContexts);
        await this.openBoxEntriesImmediately(playerBoxEntries.player2, openedSpriteFrame, true, playerRoleContexts);
        await this.alignRevealedRoles(playerRoleContexts);
        this.setPlayerBoxesVisible(false);
        await this.playPlayerRoleMergeEffects(playerRoleContexts);
        await this.playNextRoleStageMove();
        await this.playAttackStage(fightResult);
        await this.showPopupResult(fightResult);
    }

    private normalizeBoxName(boxName: string | undefined) {
        if (BOX_NODE_NAMES.indexOf(String(boxName)) >= 0) {
            return String(boxName);
        }
        return DEFAULT_BOX_NAME;
    }

    private loadBoxSpriteFrame(boxName: string) {
        return new Promise<SpriteFrame | null>((resolve) => {
            resources.load(`imgs/${boxName}/spriteFrame`, SpriteFrame, (error, spriteFrame) => {
                if (error) {
                    console.error(`[Bg] 加载宝箱图片失败: ${boxName}`, error);
                    resolve(null);
                    return;
                }
                resolve(spriteFrame);
            });
        });
    }

    private loadRoleSpriteFrame(roleIndex: number) {
        return new Promise<SpriteFrame | null>((resolve) => {
            resources.load(`imgs/role${roleIndex}/spriteFrame`, SpriteFrame, (error, spriteFrame) => {
                if (error) {
                    console.error(`[Bg] 加载角色图片失败: role${roleIndex}`, error);
                    resolve(null);
                    return;
                }
                resolve(spriteFrame);
            });
        });
    }

    private async playBoxAnimationAndOpen(boxNode: Node, openedSpriteFrame: SpriteFrame) {
        const sprite = boxNode.getComponent(Sprite);
        if (!sprite?.isValid) {
            return;
        }

        if (!sprite.isValid || !this.node.isValid) {
            return;
        }
        this.stopBoxLoopAnimation(boxNode);
        if (!this.boxOpenSoundPlayed) {
            this.boxOpenSoundPlayed = true;
            AudioManager.instance?.playOpen();
        }
        sprite.spriteFrame = openedSpriteFrame;
    }

    private startBoxLoopAnimations(boxNodes: Node[]) {
        for (const boxNode of boxNodes) {
            this.startBoxLoopAnimation(boxNode);
        }
    }

    private startBoxLoopAnimation(boxNode: Node) {
        const animation = boxNode.getComponent(Animation);
        if (!animation) {
            return;
        }
        const clipName = animation.defaultClip?.name;
        if (clipName) {
            animation.play(clipName);
            return;
        }
        animation.play();
    }

    private stopBoxLoopAnimation(boxNode: Node) {
        const animation = boxNode.getComponent(Animation);
        animation?.stop();
    }

    private runPlayer1ManualOpenStage(
        boxEntries: BoxDisplayEntry[],
        openedSpriteFrame: SpriteFrame,
        playerRoleContexts: PlayerRoleRenderContext[],
    ) {
        this.clearManualOpenStage();
        this.manualPlayerBoxEntries = boxEntries;
        this.manualPlayerRoleContexts = playerRoleContexts;
        this.manualOpenedSpriteFrame = openedSpriteFrame;
        this.manualOpenStageActive = true;
        this.manualOpenStageResolved = false;
        this.manualOpenRemainingSeconds = PLAYER_MANUAL_OPEN_SECONDS;
        this.updateManualOpenCountdown();
        if (this.manualOpenCountdownLabel?.isValid) {
            this.manualOpenCountdownLabel.node.active = true;
        }
        this.bindManualBoxEvents(boxEntries, openedSpriteFrame, playerRoleContexts);
        this.schedule(this.handleManualOpenCountdownTick, 1);
        return new Promise<void>((resolve) => {
            this.manualOpenStageResolver = resolve;
        });
    }

    private bindManualBoxEvents(
        boxEntries: BoxDisplayEntry[],
        openedSpriteFrame: SpriteFrame,
        playerRoleContexts: PlayerRoleRenderContext[],
    ) {
        for (const entry of boxEntries) {
            if (!entry.node?.isValid) {
                continue;
            }
            if (entry.touchHandler) {
                entry.node.off(Node.EventType.TOUCH_END, entry.touchHandler, this);
            }
            entry.touchHandler = (event: EventTouch) => {
                void this.handleManualBoxTouch(entry, event, openedSpriteFrame, playerRoleContexts);
            };
            entry.node.on(Node.EventType.TOUCH_END, entry.touchHandler, this);
        }
    }

    private async handleManualBoxTouch(
        entry: BoxDisplayEntry,
        event: EventTouch,
        openedSpriteFrame: SpriteFrame,
        playerRoleContexts: PlayerRoleRenderContext[],
    ) {
        event.propagationStopped = true;
        if (!this.manualOpenStageActive || entry.isOpened || entry.isOpening || !entry.node?.isValid) {
            return;
        }
        entry.isOpening = true;
        this.boxOpenSoundPlayed = false;
        entry.openingTask = this.playBoxAnimationAndOpen(entry.node, openedSpriteFrame);
        await entry.openingTask;
        entry.openingTask = null;
        entry.isOpening = false;
        entry.isOpened = true;
        await this.revealRoleForBoxEntry(entry, playerRoleContexts);
        this.checkManualOpenStageCompleted();
    }

    private readonly handleManualOpenCountdownTick = () => {
        this.manualOpenRemainingSeconds -= 1;
        this.updateManualOpenCountdown();
        if (this.manualOpenRemainingSeconds > 0) {
            return;
        }
        this.unschedule(this.handleManualOpenCountdownTick);
        void this.finishManualOpenStageByTimeout();
    };

    private async finishManualOpenStageByTimeout() {
        const openingTasks = this.manualPlayerBoxEntries
            .map((entry) => entry.openingTask)
            .filter((task): task is Promise<void> => !!task);
        if (openingTasks.length > 0) {
            await Promise.all(openingTasks);
        }
        const unopenedEntries = this.manualPlayerBoxEntries.filter((entry) => !entry.isOpened && !entry.isOpening);
        if (unopenedEntries.length > 0 && this.manualOpenedSpriteFrame) {
            await this.openBoxEntriesImmediately(
                unopenedEntries,
                this.manualOpenedSpriteFrame,
                true,
                this.manualPlayerRoleContexts,
            );
        }
        this.finishManualOpenStage();
    }

    private checkManualOpenStageCompleted() {
        if (!this.manualOpenStageActive) {
            return;
        }
        for (const entry of this.manualPlayerBoxEntries) {
            if (!entry.isOpened) {
                return;
            }
        }
        this.finishManualOpenStage();
    }

    private finishManualOpenStage() {
        if (this.manualOpenStageResolved) {
            return;
        }
        this.manualOpenStageResolved = true;
        const resolver = this.manualOpenStageResolver;
        this.clearManualOpenStage();
        resolver?.();
    }

    private clearManualOpenStage() {
        this.unschedule(this.handleManualOpenCountdownTick);
        for (const entry of this.manualPlayerBoxEntries) {
            if (entry.node?.isValid && entry.touchHandler) {
                entry.node.off(Node.EventType.TOUCH_END, entry.touchHandler, this);
            }
            entry.touchHandler = null;
            entry.isOpening = false;
            entry.openingTask = null;
        }
        this.manualPlayerBoxEntries = [];
        this.manualPlayerRoleContexts = [];
        this.manualOpenStageActive = false;
        this.manualOpenRemainingSeconds = PLAYER_MANUAL_OPEN_SECONDS;
        this.manualOpenStageResolver = null;
        this.manualOpenedSpriteFrame = null;
        this.hideManualOpenCountdown();
    }

    private hideManualOpenCountdown() {
        if (!this.manualOpenCountdownLabel?.isValid) {
            return;
        }
        this.manualOpenCountdownLabel.node.active = false;
        this.manualOpenCountdownLabel.string = this.formatManualOpenTime(PLAYER_MANUAL_OPEN_SECONDS);
    }

    private updateManualOpenCountdown() {
        if (!this.manualOpenCountdownLabel?.isValid) {
            return;
        }
        this.manualOpenCountdownLabel.string = this.formatManualOpenTime(this.manualOpenRemainingSeconds);
    }

    private formatManualOpenTime(totalSeconds: number) {
        const safeSeconds = Math.max(0, totalSeconds);
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = safeSeconds % 60;
        return `${this.formatTwoDigits(minutes)}:${this.formatTwoDigits(seconds)}`;
    }

    private formatTwoDigits(value: number) {
        return value < 10 ? `0${value}` : `${value}`;
    }

    private async openBoxEntriesImmediately(
        boxEntries: BoxDisplayEntry[],
        openedSpriteFrame: SpriteFrame,
        playOpenSound: boolean,
        playerRoleContexts: PlayerRoleRenderContext[],
    ) {
        const pendingEntries = boxEntries.filter((entry) => entry.node?.isValid && !entry.isOpened);
        if (pendingEntries.length <= 0) {
            return;
        }
        if (playOpenSound) {
            AudioManager.instance?.playOpen();
        }
        for (const entry of pendingEntries) {
            this.stopBoxLoopAnimation(entry.node);
            const sprite = entry.node.getComponent(Sprite);
            if (sprite?.isValid) {
                sprite.spriteFrame = openedSpriteFrame;
            }
            entry.isOpened = true;
            entry.isOpening = false;
            await this.revealRoleForBoxEntry(entry, playerRoleContexts);
        }
    }

    private playBoxEntryAnimation(boxNodes: Node[]) {
        return Promise.all(
            boxNodes.map((boxNode, index) => {
                const startPosition = boxNode.position.clone();
                const startScale = boxNode.scale.clone();
                boxNode.setPosition(startPosition.x, startPosition.y + BOX_ENTRY_OFFSET_Y, startPosition.z);
                boxNode.setScale(
                    startScale.x * BOX_ENTRY_SCALE,
                    startScale.y * BOX_ENTRY_SCALE,
                    startScale.z,
                );

                return new Promise<void>((resolve) => {
                    tween(boxNode)
                        .delay(index * BOX_ENTRY_STAGGER)
                        .call(() => {
                            AudioManager.instance?.playFruit();
                        })
                        .to(
                            BOX_ENTRY_DURATION,
                            {
                                position: startPosition,
                                scale: startScale,
                            },
                            {
                                easing: 'backOut',
                            },
                        )
                        .call(() => {
                            resolve();
                        })
                        .start();
                });
            }),
        ).then(() => undefined);
    }

    private async playAnimationTimes(animation: Animation, times: number) {
        const repeatTimes = times > 0 ? times : 1;
        for (let index = 0; index < repeatTimes; index += 1) {
            await this.playAnimationOnce(animation);
        }
    }

    private playAnimationOnce(animation: Animation) {
        return new Promise<void>((resolve) => {
            const finish = () => {
                animation.off(Animation.EventType.FINISHED, finish, this);
                resolve();
            };

            animation.off(Animation.EventType.FINISHED, finish, this);
            animation.once(Animation.EventType.FINISHED, finish, this);

            const clipName = animation.defaultClip?.name;
            animation.stop();
            if (clipName) {
                animation.play(clipName);
                return;
            }
            animation.play();
        });
    }

    private toOpenedBoxName(boxName: string) {
        return boxName.replace('box', 'boxOpen');
    }

    private async renderPlayerRoleSprites(fightResult: Record<string, any> | null | undefined) {
        const contexts: PlayerRoleRenderContext[] = [];
        for (let playerIndex = 0; playerIndex < PLAYER_ROLE_NODE_NAMES.length; playerIndex += 1) {
            const playerRoleNodeName = PLAYER_ROLE_NODE_NAMES[playerIndex];
            const playerNodeName = PLAYER_NODE_NAMES[playerIndex];
            const playerResultKey = PLAYER_RESULT_KEYS[playerIndex];
            const playerRoleRoot = this.node.getChildByName(playerRoleNodeName);
            const playerData = this.pickObject((fightResult as any)?.[playerResultKey]);
            const resultData = this.pickObject(playerData?.result);
            const spirits = this.pickDisplaySpirits(playerData, resultData);
            const slotNodes = this.getRoleSlotNodes(playerRoleRoot);
            if (!playerRoleRoot || spirits.length === 0 || slotNodes.length === 0) {
                continue;
            }

            const slotStates = slotNodes.map((slotNode) => ({
                position: slotNode.position.clone(),
                scale: slotNode.scale.clone(),
            }));
            const displayEntries: RoleDisplayEntry[] = [];

            for (let roleIndex = 0; roleIndex < slotNodes.length; roleIndex += 1) {
                const roleNode = slotNodes[roleIndex];
                const spiritValue = Number(spirits[roleIndex]);
                if (!Number.isFinite(spiritValue)) {
                    roleNode.active = false;
                    continue;
                }
                await this.renderRoleNode(roleNode, spiritValue);
                displayEntries.push({
                    node: roleNode,
                    spiritId: spiritValue,
                    slotIndex: roleIndex,
                });
            }

            let currentEntries = displayEntries;

            contexts.push({
                playerNodeName,
                playerRoleRoot,
                slotStates,
                currentEntries,
                resultType: this.pickResultType(resultData),
                resultData,
                isMe: playerResultKey === 'player1',
            });
        }
        return contexts;
    }

    private prepareRoleRevealStage(contexts: PlayerRoleRenderContext[]) {
        this.setPlayerRoleVisible(true);
        for (const context of contexts) {
            if (!context.playerRoleRoot?.isValid) {
                continue;
            }
            for (const entry of context.currentEntries) {
                if (entry.node?.isValid) {
                    entry.node.active = false;
                }
            }
        }
    }

    private async revealRoleForBoxEntry(entry: BoxDisplayEntry, contexts: PlayerRoleRenderContext[]) {
        if (!entry.node?.isValid) {
            return;
        }
        const roleContext = contexts.filter((context) => context.playerNodeName === entry.playerNodeName)[0] ?? null;
        const roleEntry = roleContext?.currentEntries.filter((currentEntry) => currentEntry.slotIndex === entry.slotIndex)[0] ?? null;
        if (!roleContext || !roleEntry?.node?.isValid) {
            entry.node.active = false;
            return;
        }
        entry.node.active = false;
        this.placeRoleAtBoxPosition(roleContext, roleEntry, entry.node);
        await this.playSingleRoleEntryAnimation(roleEntry.node);
    }

    private playSingleRoleEntryAnimation(roleNode: Node) {
        if (!roleNode?.isValid) {
            return Promise.resolve();
        }
        roleNode.active = true;
        const targetScale = roleNode.scale.clone();
        roleNode.setScale(0, 0, targetScale.z);
        return new Promise<void>((resolve) => {
            tween(roleNode)
                .to(
                    ROLE_ENTRY_DURATION,
                    {
                        scale: targetScale,
                    },
                    {
                        easing: 'backOut',
                    },
                )
                .call(() => {
                    resolve();
                })
                .start();
        });
    }

    private placeRoleAtBoxPosition(roleContext: PlayerRoleRenderContext, roleEntry: RoleDisplayEntry, boxNode: Node) {
        const roleNode = roleEntry?.node ?? null;
        if (!roleContext?.playerRoleRoot?.isValid || !roleNode?.isValid || !boxNode?.isValid) {
            return;
        }
        const roleRootTransform = roleContext.playerRoleRoot.getComponent(UITransform);
        if (!roleRootTransform) {
            return;
        }
        const slotState = roleContext.slotStates[roleEntry.slotIndex];
        const localPosition = roleRootTransform.convertToNodeSpaceAR(boxNode.worldPosition.clone());
        roleNode.setPosition(
            localPosition.x,
            slotState?.position.y ?? roleNode.position.y,
            slotState?.position.z ?? roleNode.position.z,
        );
    }

    private alignRevealedRoles(contexts: PlayerRoleRenderContext[]) {
        return Promise.all(
            contexts.map((context) => this.alignRevealedRolesForContext(context)),
        ).then(() => undefined);
    }

    private alignRevealedRolesForContext(context: PlayerRoleRenderContext) {
        const activeEntries = context.currentEntries.filter((entry) => entry.node?.isValid && entry.node.active);
        return Promise.all(
            activeEntries.map((entry) => {
                const slotState = context.slotStates[entry.slotIndex];
                if (!slotState) {
                    return Promise.resolve();
                }
                return new Promise<void>((resolve) => {
                    tween(entry.node)
                        .to(
                            ROLE_COMPACT_MOVE_DURATION,
                            {
                                position: new Vec3(slotState.position.x, slotState.position.y, slotState.position.z),
                                scale: slotState.scale,
                            },
                        )
                        .call(() => {
                            resolve();
                        })
                        .start();
                });
            }),
        ).then(() => undefined);
    }

    private async playPlayerRoleMergeEffects(contexts: PlayerRoleRenderContext[]) {
        for (const context of contexts) {
            if (context.resultType >= 2) {
                const mergeSfxType: MergeSfxType = context.isMe ? 'upgrade1' : 'upgrade';
                const mergeResult = await this.playMergeSequence(
                    context.playerRoleRoot,
                    context.slotStates,
                    context.currentEntries,
                    this.pickResultSpirits(context.resultData, 'big_spirits'),
                    SMALL_MERGED_ROLE_ID,
                    mergeSfxType,
                    'right',
                );
                context.currentEntries = mergeResult.currentEntries;
            }

            if (context.resultType >= 3) {
                const mergeSfxType: MergeSfxType = context.isMe ? 'upgrade2' : 'upgrade';
                const mergeResult = await this.playMergeSequence(
                    context.playerRoleRoot,
                    context.slotStates,
                    context.currentEntries,
                    this.pickResultSpirits(context.resultData, 'small_spirits'),
                    BIG_MERGED_ROLE_ID,
                    mergeSfxType,
                    'left',
                );
                context.currentEntries = mergeResult.currentEntries;
            }

            await this.compactRoleEntries(context.slotStates, context.currentEntries);
        }
    }

    private playNextRoleStageMove() {
        return Promise.all(
            PLAYER_ROLE_NODE_NAMES.map((nodeName) => {
                const roleRoot = this.node.getChildByName(nodeName);
                const targetY = PLAYER_ROLE_STAGE_TARGET_Y[nodeName];
                if (!roleRoot || !Number.isFinite(targetY)) {
                    return Promise.resolve();
                }

                const currentPosition = roleRoot.position.clone();
                return new Promise<void>((resolve) => {
                    tween(roleRoot)
                        .to(
                            PLAYER_ROLE_STAGE_MOVE_DURATION,
                            {
                                position: new Vec3(currentPosition.x, targetY, currentPosition.z),
                            },
                        )
                        .call(() => {
                            resolve();
                        })
                        .start();
                });
            }),
        ).then(() => undefined);
    }

    private async playAttackStage(fightResult: Record<string, any> | null | undefined) {
        const attackSteps = this.getAttackStageSteps(fightResult);
        for (const attackStep of attackSteps) {
            await this.playAttackStageStep(attackStep);
        }
    }

    private async playAttackStageStep(attackStep: AttackStageStep) {
        const attackerRoot = this.node.getChildByName(attackStep.attackerRootName);
        const defenderRoot = this.node.getChildByName(attackStep.defenderRootName);
        if (!attackerRoot?.isValid || !defenderRoot?.isValid) {
            return;
        }

        AudioManager.instance?.playAttack();
        AudioManager.instance?.playAttack();
        const attackerPosition = attackerRoot.position.clone();
        await new Promise<void>((resolve) => {
            tween(attackerRoot)
                .to(
                    PLAYER_ROLE_ATTACK_RISE_DURATION,
                    {
                        position: new Vec3(
                            attackerPosition.x,
                            attackerPosition.y + attackStep.attackerOffsetY,
                            attackerPosition.z,
                        ),
                    },
                )
                .call(() => {
                    resolve();
                })
                .start();
        });

        await Promise.all([
            new Promise<void>((resolve) => {
                tween(attackerRoot)
                    .to(
                        PLAYER_ROLE_ATTACK_RETURN_DURATION,
                        {
                            position: attackerPosition,
                        },
                    )
                    .call(() => {
                        resolve();
                    })
                    .start();
            }),
            this.playDefenderHitStage(
                defenderRoot,
                attackStep.defenderTargetPercent,
                attackStep.shouldDefenderDie,
            ),
        ]);
    }

    private getAttackStageSteps(fightResult: Record<string, any> | null | undefined) {
        const winner = Number(fightResult?.winner);
        if (winner === 0) {
            return [
                this.createAttackStageStep('playerRole1', 0.5, false),
                this.createAttackStageStep('playerRole2', 0.5, false),
            ];
        }
        if (winner === 1) {
            return [this.createAttackStageStep('playerRole1', 0, true)];
        }
        if (winner === 2) {
            return [this.createAttackStageStep('playerRole2', 0, true)];
        }
        return [this.createAttackStageStep(DEFAULT_ATTACKER_ROLE_ROOT, 0, true)];
    }

    private createAttackStageStep(
        attackerRootName: string,
        defenderTargetPercent: number,
        shouldDefenderDie: boolean,
    ): AttackStageStep {
        const attackConfig = this.getAttackStageConfig(attackerRootName);
        return {
            attackerRootName: attackConfig.attackerRootName,
            defenderRootName: attackConfig.defenderRootName,
            attackerOffsetY: attackConfig.attackerOffsetY,
            defenderTargetPercent,
            shouldDefenderDie,
        };
    }

    private getAttackStageConfig(attackerRootName: string): AttackStageConfig {
        const normalizedAttackerRootName = attackerRootName === 'playerRole1' ? 'playerRole1' : 'playerRole2';
        return {
            attackerRootName: normalizedAttackerRootName,
            defenderRootName: normalizedAttackerRootName === 'playerRole1' ? 'playerRole2' : 'playerRole1',
            attackerOffsetY: normalizedAttackerRootName === 'playerRole1'
                ? PLAYER_ROLE_ATTACK_OFFSET_Y
                : -PLAYER_ROLE_ATTACK_OFFSET_Y,
        };
    }

    private async playDefenderHitStage(defenderRoot: Node, defenderTargetPercent: number, shouldDefenderDie: boolean) {
        const activeRoleComponents = this.getActiveRoleComponents(defenderRoot);
        const fightNode = defenderRoot.getChildByName('fight');
        const fightAnimation = fightNode?.getComponent(Animation) ?? null;
        const singleFightDuration = this.getAnimationDuration(fightAnimation, PLAYER_ROLE_FIGHT_FALLBACK_DURATION);
        const totalFightDuration = singleFightDuration * ATTACK_FIGHT_REPEAT_TIMES;

        const fightEffectPromise = this.playFightEffect(fightNode, fightAnimation, singleFightDuration);
        await Promise.all([
            fightEffectPromise,
            this.playHitShake(defenderRoot, totalFightDuration),
            this.playRoleBarsToPercent(activeRoleComponents, totalFightDuration, defenderTargetPercent),
        ]);

        if (shouldDefenderDie) {
            await this.playDeathScale(defenderRoot);
        }
    }

    private playFightEffect(fightNode: Node | null | undefined, fightAnimation: Animation | null, singleDuration: number) {
        if (!fightNode?.isValid) {
            return this.waitSeconds(singleDuration * ATTACK_FIGHT_REPEAT_TIMES);
        }

        fightNode.active = true;
        if (!fightAnimation) {
            return this.waitSeconds(singleDuration * ATTACK_FIGHT_REPEAT_TIMES).then(() => {
                if (fightNode.isValid) {
                    fightNode.active = false;
                }
            });
        }

        return this.playAnimationTimes(fightAnimation, ATTACK_FIGHT_REPEAT_TIMES).then(() => {
            if (fightNode.isValid) {
                fightNode.active = false;
            }
        });
    }

    private playHitShake(targetNode: Node, duration: number) {
        const basePosition = targetNode.position.clone();
        const repeatCount = Math.max(1, Math.round(duration / (PLAYER_ROLE_HIT_SHAKE_STEP_DURATION * 2)));
        return new Promise<void>((resolve) => {
            let shakeTween = tween(targetNode);
            for (let index = 0; index < repeatCount; index += 1) {
                shakeTween = shakeTween
                    .to(
                        PLAYER_ROLE_HIT_SHAKE_STEP_DURATION,
                        {
                            position: new Vec3(
                                basePosition.x - PLAYER_ROLE_HIT_SHAKE_OFFSET_X,
                                basePosition.y,
                                basePosition.z,
                            ),
                        },
                    )
                    .to(
                        PLAYER_ROLE_HIT_SHAKE_STEP_DURATION,
                        {
                            position: new Vec3(
                                basePosition.x + PLAYER_ROLE_HIT_SHAKE_OFFSET_X,
                                basePosition.y,
                                basePosition.z,
                            ),
                        },
                    );
            }

            shakeTween
                .to(
                    PLAYER_ROLE_HIT_SHAKE_STEP_DURATION,
                    {
                        position: basePosition,
                    },
                )
                .call(() => {
                    resolve();
                })
                .start();
        });
    }

    private playRoleBarsToPercent(roleComponents: Role[], duration: number, targetPercent: number) {
        if (roleComponents.length === 0) {
            return Promise.resolve();
        }

        const clampedTargetPercent = Math.max(0, Math.min(1, targetPercent));
        const startValues = roleComponents.map((roleComponent) => ({
            roleComponent,
            blood: roleComponent.getBloodPercent(),
            mana: roleComponent.getManaPercent(),
        }));
        const progressState = { value: 1 };

        return new Promise<void>((resolve) => {
            tween(progressState)
                .to(
                    duration,
                    {
                        value: 0,
                    },
                    {
                        onUpdate: () => {
                            for (const item of startValues) {
                                item.roleComponent.setBloodPercent(
                                    clampedTargetPercent + (item.blood - clampedTargetPercent) * progressState.value,
                                );
                                item.roleComponent.setManaPercent(
                                    clampedTargetPercent + (item.mana - clampedTargetPercent) * progressState.value,
                                );
                            }
                        },
                    },
                )
                .call(() => {
                    for (const item of startValues) {
                        item.roleComponent.setBloodPercent(clampedTargetPercent);
                        item.roleComponent.setManaPercent(clampedTargetPercent);
                    }
                    resolve();
                })
                .start();
        });
    }

    private playDeathScale(targetNode: Node) {
        const currentScale = targetNode.scale.clone();
        return new Promise<void>((resolve) => {
            tween(targetNode)
                .to(
                    PLAYER_ROLE_DEATH_SCALE_DURATION,
                    {
                        scale: new Vec3(0, 0, currentScale.z),
                    },
                )
                .call(() => {
                    resolve();
                })
                .start();
        });
    }

    private getActiveRoleComponents(roleRoot: Node) {
        const roleComponents: Role[] = [];
        for (const roleNodeName of ROLE_NODE_NAMES) {
            const roleNode = roleRoot.getChildByName(roleNodeName);
            const roleComponent = roleNode?.getComponent(Role) ?? null;
            if (!roleNode?.active || !roleComponent) {
                continue;
            }
            roleComponents.push(roleComponent);
        }
        return roleComponents;
    }

    private getAnimationDuration(animation: Animation | null, fallbackDuration: number) {
        const clip = animation?.defaultClip as any;
        const duration = Number(clip?.duration ?? clip?._duration);
        if (!Number.isFinite(duration) || duration <= 0) {
            return fallbackDuration;
        }
        return duration;
    }

    private waitSeconds(duration: number) {
        return new Promise<void>((resolve) => {
            this.scheduleOnce(() => {
                resolve();
            }, duration);
        });
    }

    private async showPopupResult(fightResult: Record<string, any> | null | undefined) {
        const popupResult = this.popupResult
            ?? this.node.scene?.getChildByPath('PopupRoot/popupResult')?.getComponent(PopupResult)
            ?? null;
        if (!popupResult) {
            console.warn('[Bg] 未绑定 popupResult 组件');
            return;
        }
        await popupResult.showResult({
            winner: fightResult?.winner,
            player1_income: fightResult?.player1_income,
        });
    }

    private pickSpirits(player: Record<string, any> | null | undefined) {
        const spirits = player?.spirits;
        if (!Array.isArray(spirits)) {
            return [];
        }
        return spirits
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value));
    }

    private pickDisplaySpirits(
        player: Record<string, any> | null | undefined,
        result: Record<string, any> | null | undefined,
    ) {
        const resultType = this.pickResultType(result);
        if (resultType <= 1) {
            return this.pickSpirits(player);
        }
        const orderedSpirits = this.pickResultSpirits(result, 'big_spirits')
            .concat(this.pickResultSpirits(result, 'small_spirits'));
        if (orderedSpirits.length > 0) {
            return orderedSpirits;
        }
        return this.pickSpirits(player);
    }

    private pickResultType(result: Record<string, any> | null | undefined) {
        const value = Number(result?.type);
        if (!Number.isFinite(value) || value <= 0) {
            return 1;
        }
        return value;
    }

    private pickResultSpirits(result: Record<string, any> | null | undefined, fieldName: 'small_spirits' | 'big_spirits') {
        const spirits = result?.[fieldName];
        if (!Array.isArray(spirits)) {
            return [];
        }
        return spirits
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value));
    }

    private pickObject(value: any) {
        if (!value || Array.isArray(value) || typeof value !== 'object') {
            return null;
        }
        return value as Record<string, any>;
    }

    private getRoleSlotNodes(playerRoleRoot: Node | null) {
        if (!playerRoleRoot) {
            return [];
        }
        const nodes: Node[] = [];
        for (const roleNodeName of ROLE_NODE_NAMES) {
            const roleNode = playerRoleRoot.getChildByName(roleNodeName);
            if (roleNode) {
                nodes.push(roleNode);
            }
        }
        return nodes;
    }

    private async renderRoleNode(roleNode: Node, spiritId: number) {
        const spriteNode = roleNode.getChildByPath('role/role') ?? null;
        const sprite = spriteNode?.getComponent(Sprite) ?? null;
        if (!sprite) {
            roleNode.active = false;
            return;
        }

        const spriteFrame = await this.loadRoleSpriteFrame(spiritId);
        if (!spriteFrame || !sprite.isValid || !roleNode.isValid) {
            roleNode.active = false;
            return;
        }

        sprite.spriteFrame = spriteFrame;
        const roleComponent = roleNode.getComponent(Role) ?? null;
        roleComponent?.renderSpiritInfo(spiritId);
        roleComponent?.resetBarPercent();
        roleComponent?.hideEffect();
        roleComponent?.refreshLayout();
        roleNode.active = true;
    }

    private async playMergeSequence(
        playerRoleRoot: Node,
        slotStates: RoleSlotState[],
        currentEntries: RoleDisplayEntry[],
        mergeSpiritIds: number[],
        mergedSpiritId: number,
        mergeSfxType: MergeSfxType,
        mergeDirection: MergeDirection,
    ): Promise<MergeSequenceResult> {
        const targetEntries = this.pickMergeEntries(currentEntries, mergeSpiritIds);
        if (targetEntries.length <= 1) {
            return {
                currentEntries,
            };
        }

        const targetEntry = mergeDirection === 'right'
            ? targetEntries[targetEntries.length - 1]
            : targetEntries[0];

        await this.mergeRoleNodes(targetEntries, targetEntry);
        if (!this.node.isValid || !playerRoleRoot.isValid) {
            return {
                currentEntries,
            };
        }

        targetEntry.node.setSiblingIndex(playerRoleRoot.children.length - 1);
        await this.playRoleEffect(targetEntry.node, mergeSfxType);
        if (!this.node.isValid || !playerRoleRoot.isValid || !targetEntry.node.isValid) {
            return {
                currentEntries,
            };
        }

        for (const entry of targetEntries) {
            if (entry === targetEntry) {
                continue;
            }
            if (entry.node.isValid) {
                entry.node.active = false;
            }
        }
        await this.renderRoleNode(targetEntry.node, mergedSpiritId);

        const nextEntries = currentEntries
            .filter((entry) => targetEntries.indexOf(entry) < 0 || entry === targetEntry)
            .map((entry) => {
                if (entry !== targetEntry) {
                    return entry;
                }
                return {
                    node: targetEntry.node,
                    spiritId: mergedSpiritId,
                    slotIndex: targetEntry.slotIndex,
                };
            });

        this.restoreRoleLayout(slotStates, nextEntries);
        return {
            currentEntries: nextEntries,
        };
    }

    private mergeRoleNodes(targetEntries: RoleDisplayEntry[], targetEntry: RoleDisplayEntry) {
        const targetNode = targetEntry?.node ?? null;
        if (!targetNode?.isValid) {
            return Promise.resolve();
        }
        const targetPosition = targetNode.position.clone();
        return Promise.all(
            targetEntries.map((entry) => {
                if (!entry.node.isValid || entry === targetEntry) {
                    return Promise.resolve();
                }
                return new Promise<void>((resolve) => {
                    tween(entry.node)
                        .to(
                            ROLE_MERGE_MOVE_DURATION,
                            {
                                position: new Vec3(targetPosition.x, targetPosition.y, targetPosition.z),
                            },
                        )
                        .call(() => {
                            resolve();
                        })
                        .start();
                });
            }),
        ).then(() => undefined);
    }

    private restoreRoleLayout(slotStates: RoleSlotState[], entries: RoleDisplayEntry[]) {
        for (let index = 0; index < entries.length; index += 1) {
            const entry = entries[index];
            const slotState = slotStates[index];
            if (!entry?.node?.isValid || !slotState) {
                continue;
            }
            entry.node.setScale(slotState.scale);
        }
    }

    private compactRoleEntries(slotStates: RoleSlotState[], entries: RoleDisplayEntry[]) {
        const activeEntries = entries.filter((entry) => entry?.node?.isValid);
        const compactStates = this.buildCenteredSlotStates(slotStates, activeEntries.length);
        return Promise.all(
            activeEntries.map((entry, index) => {
                const slotState = compactStates[index];
                if (!slotState) {
                    return Promise.resolve();
                }
                entry.node.active = true;
                entry.node.setSiblingIndex(index);
                return new Promise<void>((resolve) => {
                    tween(entry.node)
                        .to(
                            ROLE_COMPACT_MOVE_DURATION,
                            {
                                position: new Vec3(slotState.position.x, slotState.position.y, slotState.position.z),
                                scale: slotState.scale,
                            },
                        )
                        .call(() => {
                            resolve();
                        })
                        .start();
                });
            }),
        ).then(() => undefined);
    }

    private buildCenteredSlotStates(slotStates: RoleSlotState[], activeCount: number) {
        if (slotStates.length === 0 || activeCount <= 0) {
            return [];
        }

        const validCount = Math.min(activeCount, slotStates.length);
        if (validCount >= slotStates.length) {
            return slotStates.slice(0, validCount);
        }

        const centerX = this.getAverageX(slotStates);
        const spacing = this.getAverageSpacing(slotStates);
        const centerIndexOffset = (validCount - 1) * 0.5;
        const middleSlotState = slotStates[Math.floor((slotStates.length - 1) * 0.5)] ?? slotStates[0];

        const centeredStates: RoleSlotState[] = [];
        for (let index = 0; index < validCount; index += 1) {
            const offsetIndex = index - centerIndexOffset;
            centeredStates.push({
                position: new Vec3(
                    centerX + offsetIndex * spacing,
                    middleSlotState.position.y,
                    middleSlotState.position.z,
                ),
                scale: middleSlotState.scale.clone(),
            });
        }
        return centeredStates;
    }

    private getAverageX(slotStates: RoleSlotState[]) {
        if (slotStates.length === 0) {
            return 0;
        }
        let totalX = 0;
        for (const slotState of slotStates) {
            totalX += slotState.position.x;
        }
        return totalX / slotStates.length;
    }

    private getAverageSpacing(slotStates: RoleSlotState[]) {
        if (slotStates.length <= 1) {
            return 0;
        }
        let totalSpacing = 0;
        for (let index = 1; index < slotStates.length; index += 1) {
            totalSpacing += slotStates[index].position.x - slotStates[index - 1].position.x;
        }
        return totalSpacing / (slotStates.length - 1);
    }

    private pickMergeEntries(currentEntries: RoleDisplayEntry[], mergeSpiritIds: number[]) {
        if (mergeSpiritIds.length === 0) {
            return [];
        }

        const countMap: Record<string, number> = {};
        for (const spiritId of mergeSpiritIds) {
            const key = String(spiritId);
            countMap[key] = (countMap[key] ?? 0) + 1;
        }

        const matchedEntries: RoleDisplayEntry[] = [];
        for (const entry of currentEntries) {
            const key = String(entry.spiritId);
            const count = countMap[key] ?? 0;
            if (count <= 0) {
                continue;
            }
            countMap[key] = count - 1;
            matchedEntries.push(entry);
        }
        return matchedEntries;
    }

    private async playRoleEffect(roleNode: Node, mergeSfxType: MergeSfxType = 'upgrade') {
        const roleComponent = roleNode.getComponent(Role) ?? null;
        if (!roleComponent) {
            return;
        }
        if (mergeSfxType === 'upgrade2') {
            AudioManager.instance?.playUpgrade2();
        } else if (mergeSfxType === 'upgrade1') {
            AudioManager.instance?.playUpgrade1();
        } else {
            AudioManager.instance?.playUpgrade();
        }
        await roleComponent.playEffect();
    }

    private applyRoleLayout(playerRoleRoot: Node, slotStates: RoleSlotState[], entries: RoleDisplayEntry[]) {
        const activeNodes: Node[] = [];
        for (let index = 0; index < entries.length; index += 1) {
            const entry = entries[index];
            const slotState = slotStates[index];
            if (!entry?.node?.isValid || !slotState) {
                continue;
            }
            entry.node.active = true;
            entry.node.setPosition(slotState.position);
            entry.node.setScale(slotState.scale);
            entry.node.setSiblingIndex(index);
            activeNodes.push(entry.node);
        }

        for (const childNode of playerRoleRoot.children) {
            if (activeNodes.indexOf(childNode) >= 0) {
                continue;
            }
            childNode.active = false;
        }
    }

    private setPlayerBoxesVisible(visible: boolean) {
        for (const nodeName of PLAYER_NODE_NAMES) {
            const playerNode = this.node.getChildByName(nodeName);
            if (playerNode) {
                playerNode.active = visible;
            }
        }
    }

    private setPlayerRoleVisible(visible: boolean) {
        for (const nodeName of PLAYER_ROLE_NODE_NAMES) {
            const roleNode = this.node.getChildByName(nodeName);
            if (roleNode) {
                roleNode.active = visible;
            }
        }
    }

    private playPlayerRoleEntryAnimation() {
        const roleChildren: Node[] = [];

        for (const nodeName of PLAYER_ROLE_NODE_NAMES) {
            const roleRootNode = this.node.getChildByName(nodeName);
            if (!roleRootNode) {
                continue;
            }

            for (const childNode of roleRootNode.children) {
                if (!childNode.active) {
                    continue;
                }
                roleChildren.push(childNode);
            }
        }

        return Promise.all(
            roleChildren.map((roleNode, index) => {
                const targetScale = roleNode.scale.clone();
                roleNode.setScale(0, 0, targetScale.z);

                return new Promise<void>((resolve) => {
                    tween(roleNode)
                        .delay(index * ROLE_ENTRY_STAGGER)
                        .to(
                            ROLE_ENTRY_DURATION,
                            {
                                scale: targetScale,
                            },
                            {
                                easing: 'backOut',
                            },
                        )
                        .call(() => {
                            resolve();
                        })
                        .start();
                });
            }),
        ).then(() => undefined);
    }

    private safeOff(node: Node | null | undefined, eventType: string, callback: (...args: any[]) => void) {
        const target = node as any;
        if (!target?.isValid || !target._eventProcessor) {
            return;
        }
        target.off(eventType, callback, this);
    }
}

