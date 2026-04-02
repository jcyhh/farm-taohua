import { _decorator, Component, Node, Label, EventHandler, EditBox } from 'cc';
import { AudioManager } from '../Manager/AudioManager';

const { ccclass, property } = _decorator;

@ccclass('Count')
export class Count extends Component {
    @property({ type: Label, tooltip: '数量文本' })
    numLabel: Label | null = null;

    @property({ type: EditBox, tooltip: '数量输入框' })
    numEditBox: EditBox | null = null;

    @property({ type: Node, tooltip: '减号按钮' })
    subBtn: Node | null = null;

    @property({ type: Node, tooltip: '加号按钮' })
    addBtn: Node | null = null;

    @property({ tooltip: '最小值' })
    min = 1;

    @property({ tooltip: '最大值' })
    max = 99;

    @property({ tooltip: '初始值' })
    defaultValue = 1;

    @property({ tooltip: '步长' })
    step = 1;

    @property({ type: [EventHandler], tooltip: '数量变化回调' })
    changeEvents: EventHandler[] = [];

    private _value = 1;
    get value(): number {
        return this._value;
    }

    set value(v: number) {
        this._value = Math.max(this.min, Math.min(this.max, v));
        this.updateUI();
        EventHandler.emitEvents(this.changeEvents, this._value);
    }

    onLoad() {
        this.numLabel = this.numLabel ?? this.node.getChildByPath('count/Label')?.getComponent(Label) ?? null;
        this.numEditBox = this.numEditBox ?? this.node.getChildByPath('count/EditBox')?.getComponent(EditBox) ?? null;
        this.subBtn = this.subBtn ?? this.node.getChildByName('sub');
        this.addBtn = this.addBtn ?? this.node.getChildByName('add');
        this._value = Math.max(this.min, Math.min(this.max, this.defaultValue));
        if (this.numEditBox) {
            this.numEditBox.inputMode = EditBox.InputMode.NUMERIC;
        }
        this.numEditBox?.node.on(EditBox.EventType.TEXT_CHANGED, this.onEditBoxChanged, this);
        this.numEditBox?.node.on(EditBox.EventType.EDITING_DID_ENDED, this.onEditBoxEditEnd, this);
        this.updateUI();
    }

    onDestroy() {
        this.safeOff(this.numEditBox?.node, EditBox.EventType.TEXT_CHANGED, this.onEditBoxChanged);
        this.safeOff(this.numEditBox?.node, EditBox.EventType.EDITING_DID_ENDED, this.onEditBoxEditEnd);
    }

    onSub() {
        if (this._value <= this.min) return;
        AudioManager.instance?.playClick();
        this.value = this._value - this.step;
    }

    onAdd() {
        if (this._value >= this.max) return;
        AudioManager.instance?.playClick();
        this.value = this._value + this.step;
    }

    private onEditBoxChanged() {
        if (!this.numEditBox?.node.activeInHierarchy) return;

        const normalized = this.normalizeEditBoxValue(this.numEditBox.string);
        if (this.numEditBox.string !== normalized) {
            this.numEditBox.string = normalized;
        }
    }

    private onEditBoxEditEnd() {
        if (this.numEditBox?.node.activeInHierarchy) {
            const normalized = this.normalizeEditBoxValue(this.numEditBox.string);
            const nextValue = this.parseEditBoxValue(normalized);
            this.value = nextValue ?? Math.max(0, this.min);
        }
        this.updateUI();
    }

    private updateUI() {
        if (this.numLabel) {
            this.numLabel.string = this._value.toString();
        }
        if (this.numEditBox) {
            this.numEditBox.string = this._value.toString();
        }
    }

    private parseEditBoxValue(value: string) {
        const normalized = this.normalizeEditBoxValue(value);
        if (!normalized) {
            return null;
        }

        const rawValue = Number(normalized);
        if (!Number.isFinite(rawValue)) {
            return null;
        }

        return Math.max(this.min, Math.min(this.max, rawValue));
    }

    private normalizeEditBoxValue(value: string) {
        const normalized = value.replace(/[^\d]/g, '');
        if (!normalized) {
            return '';
        }
        return String(Math.max(0, Number(normalized) || 0));
    }

    private getCurrentInputValue() {
        if (this.numEditBox?.node.activeInHierarchy) {
            const currentValue = this.parseEditBoxValue(this.numEditBox.string);
            if (currentValue !== null) {
                return currentValue;
            }
        }
        return this._value;
    }

    private safeOff(node: Node | null | undefined, eventType: string, callback: (...args: any[]) => void) {
        const target = node as any;
        if (!target?.isValid || !target._eventProcessor) {
            return;
        }
        target.off(eventType, callback, this);
    }
}
