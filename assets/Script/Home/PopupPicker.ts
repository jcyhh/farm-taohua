import { _decorator, Button, Component, director, Label, Node } from 'cc';
import { t } from '../Config/I18n';
import { Storage } from '../Utils/Storage';
import { Popup } from '../Common/Popup';
import { Land } from '../Prefab/Land';
const { ccclass, property } = _decorator;
export const LAND_TYPE_CHANGED_EVENT = 'land-type-changed';

@ccclass('PopupPicker')
export class PopupPicker extends Component {
    private static readonly ITEM_NAMES = ['pickerItem', 'pickerItem-001', 'pickerItem-002', 'pickerItem-003', 'pickerItem-004'];
    private static readonly LAND_NAMES = ['沙土地', '褐土地', '金土地', '红土地', '黑土地'];

    @property({ tooltip: '默认选中的值(1-5)' })
    defaultValue = 1;

    @property({ tooltip: '本地缓存 key' })
    storageKey = 'popup_picker_value';

    private itemNodes: Node[] = [];
    private selectedValue = 1;
    private readonly finishSelectionResult = () => {
        PopupPicker.renderLandName(this.selectedValue);
        Land.setLandType(this.selectedValue);
        director.emit(LAND_TYPE_CHANGED_EVENT, this.selectedValue);
    };
    private readonly applySelectionResult = () => {
        const popup = this.getComponent(Popup);
        const closeDuration = popup ? popup.step1Duration + popup.step2Duration : 0;
        popup?.close();
        this.scheduleOnce(this.finishSelectionResult, closeDuration);
    };

    get value() {
        return this.selectedValue;
    }

    static getLandName(value: number) {
        const key = PopupPicker.LAND_NAMES[PopupPicker.normalizeValue(value) - 1] ?? PopupPicker.LAND_NAMES[0];
        return t(key);
    }

    static renderStoredLandName(storageKey = 'popup_picker_value', defaultValue = 1) {
        const value = Storage.getNumber(storageKey, defaultValue);
        PopupPicker.renderLandName(value);
    }

    onLoad() {
        const popupContent = this.node.getChildByName('popupContent');
        if (!popupContent) {
            console.error('[PopupPicker] 未找到 popupContent 节点');
            return;
        }

        this.itemNodes = PopupPicker.ITEM_NAMES
            .map((name) => popupContent.getChildByName(name))
            .filter((node): node is Node => !!node);

        this.itemNodes.forEach((node, index) => {
            node.on(Button.EventType.CLICK, () => this.selectValue(index + 1), this);
        });
    }

    start() {
        const cachedValue = Storage.getNumber(this.storageKey, this.defaultValue);
        const initialValue = PopupPicker.normalizeValue(cachedValue);
        this.applySelectionState(initialValue);
        PopupPicker.renderLandName(initialValue);
    }

    onDestroy() {
        this.unschedule(this.finishSelectionResult);
        this.unschedule(this.applySelectionResult);
        this.itemNodes.forEach((node) => this.safeTargetOff(node));
    }

    private selectValue(value: number) {
        this.applySelectionState(value);
        this.unschedule(this.finishSelectionResult);
        this.unschedule(this.applySelectionResult);
        this.scheduleOnce(this.applySelectionResult, 0.3);
    }

    private applySelectionState(value: number) {
        this.selectedValue = PopupPicker.normalizeValue(value);
        this.itemNodes.forEach((node, index) => {
            const button = node.getComponent(Button);
            if (button) {
                // 利用按钮的 Disabled Sprite 显示选中态。
                button.interactable = index + 1 !== this.selectedValue;
            }
        });

        Storage.setNumber(this.storageKey, this.selectedValue);
        this.node.emit('change', this.selectedValue);
    }

    private static renderLandName(value: number) {
        const label = PopupPicker.findLandNameLabel();
        if (!label) {
            console.error('[PopupPicker] 未找到 house10 下的 Label 组件');
            return;
        }

        label.string = PopupPicker.getLandName(value);
    }

    private static findLandNameLabel() {
        const scene = director.getScene();
        if (!scene) return null;

        const directLabel = scene.getChildByPath('Canvas/MapRoot/house10/Label')?.getComponent(Label)
            ?? scene.getChildByPath('Canvas/MapRoot/house10/house13/Label')?.getComponent(Label);
        if (directLabel) {
            return directLabel;
        }

        const house10 = scene.getChildByPath('Canvas/MapRoot/house10');
        return PopupPicker.findLabelInNode(house10 ?? null);
    }

    private static findLabelInNode(node: Node | null): Label | null {
        if (!node) return null;
        if (node.name === 'Label') {
            return node.getComponent(Label) ?? null;
        }

        for (const child of node.children) {
            const label = PopupPicker.findLabelInNode(child);
            if (label) return label;
        }

        return null;
    }

    private static normalizeValue(value: number) {
        const max = PopupPicker.LAND_NAMES.length;
        return Math.min(Math.max(Math.floor(value || 1), 1), max);
    }

    private safeTargetOff(node: Node | null | undefined) {
        const target = node as any;
        if (!target?.isValid || !target._eventProcessor) {
            return;
        }
        target.targetOff(this);
    }
}

