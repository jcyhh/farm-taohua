import { _decorator, Component, Node, Label, EventHandler } from 'cc';
import { AudioManager } from '../Manager/AudioManager';

const { ccclass, property } = _decorator;

@ccclass('Count')
export class Count extends Component {
    @property({ type: Label, tooltip: '数量文本' })
    numLabel: Label | null = null;

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
        this._value = Math.max(this.min, Math.min(this.max, this.defaultValue));
        this.updateUI();
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

    private updateUI() {
        if (this.numLabel) {
            this.numLabel.string = this._value.toString();
        }
    }
}
