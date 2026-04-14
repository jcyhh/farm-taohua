import { Animation, Label, Node, Sprite } from 'cc';
import { AudioManager } from '../Manager/AudioManager';
import { formatAmount } from '../Utils/Format';

const BOX_NAMES = ['box1', 'box2', 'box3', 'box4', 'box5'];
const DEFAULT_BOX_NAME = 'box1';
const BOX_ANIMATION_CHILDREN = ['ring', 'box'];
const BOX_CHOOSE_NODE_NAMES = ['choose', 'chooose'];
const BOX_SPRITE_NODE_NAME = 'box';
const BOX_PRICE_LABEL_NAME = 'Label';

export class BattleBoxSelector {
    private readonly boxNodeMap = new Map<string, Node>();
    private readonly boxAmountMap = new Map<string, number | string>();
    private readonly step2BoxSprite: Sprite | null;
    private selectedBoxName = DEFAULT_BOX_NAME;
    private selectedBoxAmount: number | string = 0;

    constructor(step1Root: Node | null, step2BoxSprite: Sprite | null) {
        this.step2BoxSprite = step2BoxSprite;
        this.collectBoxes(step1Root);
    }

    selectBox(boxName: string) {
        if (!this.boxNodeMap.has(boxName)) {
            return;
        }
        const shouldPlayClick = this.selectedBoxName !== boxName;

        this.selectedBoxName = boxName;
        this.updateSelectedBoxAmount(boxName);
        this.updateStep2BoxSprite(boxName);
        if (shouldPlayClick) {
            AudioManager.instance?.playClick();
        }
        for (const [currentBoxName, boxNode] of this.boxNodeMap.entries()) {
            this.updateBoxChooseState(boxNode, currentBoxName === boxName);
            if (currentBoxName === boxName) {
                this.playBoxAnimations(boxNode);
                continue;
            }
            this.stopBoxAnimations(boxNode);
        }
    }

    renderBoxAmounts(amounts: Array<number | string>) {
        for (let index = 0; index < BOX_NAMES.length; index += 1) {
            const boxName = BOX_NAMES[index];
            const nextAmount = amounts[index] ?? 0;
            this.boxAmountMap.set(boxName, nextAmount);

            const boxLabel = this.findPriceLabel(boxName);
            if (!boxLabel) {
                continue;
            }

            boxLabel.string = formatAmount(nextAmount);
        }

        this.updateSelectedBoxAmount(this.selectedBoxName);
    }

    getSelectedBoxAmount() {
        return this.selectedBoxAmount;
    }

    getSelectedBoxName() {
        return this.selectedBoxName;
    }

    getBoxNameByAmount(amount: number | string | null | undefined) {
        const targetAmount = this.normalizeAmount(amount);
        if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
            return null;
        }

        for (const boxName of BOX_NAMES) {
            const currentAmount = this.normalizeAmount(this.boxAmountMap.get(boxName));
            if (!Number.isFinite(currentAmount)) {
                continue;
            }
            if (currentAmount === targetAmount) {
                return boxName;
            }
        }

        return null;
    }

    private collectBoxes(step1Root: Node | null) {
        this.boxNodeMap.clear();
        for (const boxName of BOX_NAMES) {
            const boxNode = step1Root?.getChildByName(boxName) ?? null;
            if (!boxNode) {
                continue;
            }
            this.boxNodeMap.set(boxName, boxNode);
        }
    }

    private updateSelectedBoxAmount(boxName: string) {
        const cachedAmount = this.boxAmountMap.get(boxName);
        if (cachedAmount !== undefined) {
            this.selectedBoxAmount = cachedAmount;
            return;
        }

        const boxLabel = this.findPriceLabel(boxName);
        this.selectedBoxAmount = boxLabel?.string?.trim() || '0';
    }

    private normalizeAmount(amount: number | string | null | undefined) {
        const normalized = Number(String(amount ?? '').replace(/,/g, '').trim());
        if (!Number.isFinite(normalized)) {
            return NaN;
        }
        return normalized;
    }

    private findPriceLabel(boxName: string) {
        const boxNode = this.boxNodeMap.get(boxName);
        const labelNode = boxNode ? this.findChildrenByName(boxNode, BOX_PRICE_LABEL_NAME)[0] ?? null : null;
        return labelNode?.getComponent(Label) ?? null;
    }

    private updateStep2BoxSprite(boxName: string) {
        const targetSprite = this.step2BoxSprite;
        if (!targetSprite) {
            return;
        }

        const sourceSprite = this.boxNodeMap.get(boxName)?.getChildByName(BOX_SPRITE_NODE_NAME)?.getComponent(Sprite) ?? null;
        if (!sourceSprite?.spriteFrame) {
            return;
        }

        targetSprite.spriteFrame = sourceSprite.spriteFrame;
    }

    private updateBoxChooseState(boxNode: Node, selected: boolean) {
        const chooseNodes: Node[] = [];
        for (const nodeName of BOX_CHOOSE_NODE_NAMES) {
            chooseNodes.push(...this.findChildrenByName(boxNode, nodeName));
        }
        for (const chooseNode of chooseNodes) {
            chooseNode.active = selected;
        }
    }

    private playBoxAnimations(boxNode: Node) {
        for (const childName of BOX_ANIMATION_CHILDREN) {
            const animation = boxNode.getChildByName(childName)?.getComponent(Animation);
            if (!animation) {
                continue;
            }
            const clipName = animation.defaultClip?.name;
            animation.stop();
            if (clipName) {
                animation.play(clipName);
                continue;
            }
            animation.play();
        }
    }

    private stopBoxAnimations(boxNode: Node) {
        for (const childName of BOX_ANIMATION_CHILDREN) {
            const animation = boxNode.getChildByName(childName)?.getComponent(Animation);
            if (!animation) {
                continue;
            }
            animation.stop();
        }
    }

    private findChildrenByName(root: Node, targetName: string) {
        const matchedNodes: Node[] = [];
        const stack: Node[] = [...root.children];

        while (stack.length > 0) {
            const currentNode = stack.pop();
            if (!currentNode) {
                continue;
            }
            if (currentNode.name === targetName) {
                matchedNodes.push(currentNode);
            }
            if (currentNode.children.length > 0) {
                stack.push(...currentNode.children);
            }
        }

        return matchedNodes;
    }
}
