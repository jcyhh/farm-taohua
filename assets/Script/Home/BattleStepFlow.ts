import { Node } from 'cc';

export const BATTLE_SHOW_STEP1_EVENT = 'battle-show-step1';
export const BATTLE_HEADBAR_QUIT_EVENT = 'battle-headbar-quit';

export enum BattleFlowStatus {
    IDLE = 'idle',
    MATCHING = 'matching',
    GAMING = 'gaming',
}

const STEP_ONE = 1;
const STEP_TWO = 2;

const STEP_TWO_PAGE_ONE = 1;
const STEP_TWO_PAGE_TWO = 2;
const STEP_TWO_PAGE_THREE = 3;

const STEP_ONE_NODE_NAME = 'step1';
const STEP_TWO_NODE_NAME = 'step2';
const STEP_TWO_PAGE_ONE_NODE_NAME = 'step2-1';
const STEP_TWO_PAGE_TWO_NODE_NAME = 'step2-2';
const STEP_TWO_PAGE_THREE_NODE_NAME = 'step2-3';

export class BattleStepFlow {
    static current: BattleStepFlow | null = null;

    private readonly step1Node: Node | null;
    private readonly step2Node: Node | null;
    private readonly step2Page1Node: Node | null;
    private readonly step2Page2Node: Node | null;
    private readonly step2Page3Node: Node | null;

    private currentStep = STEP_ONE;
    private currentStep2Page = STEP_TWO_PAGE_ONE;
    private inGame = false;

    constructor(rootNode: Node) {
        this.step1Node = rootNode.getChildByName(STEP_ONE_NODE_NAME);
        this.step2Node = rootNode.getChildByName(STEP_TWO_NODE_NAME);
        this.step2Page1Node = this.step2Node?.getChildByName(STEP_TWO_PAGE_ONE_NODE_NAME) ?? null;
        this.step2Page2Node = this.step2Node?.getChildByName(STEP_TWO_PAGE_TWO_NODE_NAME) ?? null;
        this.step2Page3Node = this.step2Node?.getChildByName(STEP_TWO_PAGE_THREE_NODE_NAME) ?? null;
        BattleStepFlow.current = this;
        this.applyState();
    }

    destroy() {
        if (BattleStepFlow.current === this) {
            BattleStepFlow.current = null;
        }
    }

    showStep1() {
        this.inGame = false;
        this.currentStep = STEP_ONE;
        this.currentStep2Page = STEP_TWO_PAGE_ONE;
        this.applyState();
    }

    showStep2() {
        this.inGame = false;
        this.currentStep = STEP_TWO;
        this.currentStep2Page = STEP_TWO_PAGE_ONE;
        this.applyState();
    }

    showStep2AutoMatch() {
        this.inGame = false;
        this.currentStep = STEP_TWO;
        this.currentStep2Page = STEP_TWO_PAGE_TWO;
        this.applyState();
    }

    showStep2ManualMatch() {
        this.inGame = false;
        this.currentStep = STEP_TWO;
        this.currentStep2Page = STEP_TWO_PAGE_THREE;
        this.applyState();
    }

    isStep1Active() {
        return this.currentStep === STEP_ONE;
    }

    isStep2ManualMatchActive() {
        return this.currentStep === STEP_TWO && this.currentStep2Page === STEP_TWO_PAGE_THREE;
    }

    isIdle() {
        return this.getStatus() === BattleFlowStatus.IDLE;
    }

    isMatching() {
        return this.getStatus() === BattleFlowStatus.MATCHING;
    }

    isGaming() {
        return this.getStatus() === BattleFlowStatus.GAMING;
    }

    setGaming(active: boolean) {
        this.inGame = active;
    }

    getStatus() {
        if (this.inGame) {
            return BattleFlowStatus.GAMING;
        }
        if (this.currentStep === STEP_TWO && this.currentStep2Page !== STEP_TWO_PAGE_ONE) {
            return BattleFlowStatus.MATCHING;
        }
        return BattleFlowStatus.IDLE;
    }

    getStep1Node() {
        return this.step1Node;
    }

    getStep2BoxSpriteNode() {
        return this.step2Node?.getChildByName('box') ?? null;
    }

    private applyState() {
        if (this.step1Node) {
            this.step1Node.active = this.currentStep === STEP_ONE;
        }
        if (this.step2Node) {
            this.step2Node.active = this.currentStep === STEP_TWO;
        }
        if (this.step2Page1Node) {
            this.step2Page1Node.active = this.currentStep === STEP_TWO && this.currentStep2Page === STEP_TWO_PAGE_ONE;
        }
        if (this.step2Page2Node) {
            this.step2Page2Node.active = this.currentStep === STEP_TWO && this.currentStep2Page === STEP_TWO_PAGE_TWO;
        }
        if (this.step2Page3Node) {
            this.step2Page3Node.active = this.currentStep === STEP_TWO && this.currentStep2Page === STEP_TWO_PAGE_THREE;
        }
    }
}
