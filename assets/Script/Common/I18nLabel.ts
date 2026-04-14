import { _decorator, Component, EditBox, Label, RichText } from 'cc';
import { t } from '../Config/I18n';

const { ccclass } = _decorator;

@ccclass('I18nLabel')
export class I18nLabel extends Component {
    private label: Label | null = null;
    private richText: RichText | null = null;
    private editBox: EditBox | null = null;
    private textKey = '';

    onLoad() {
        this.label = this.getComponent(Label);
        this.richText = this.getComponent(RichText);
        this.editBox = this.getComponent(EditBox);
        this.captureTextKey();
        this.applyText();
    }

    start() {
        if (!this.textKey) {
            this.captureTextKey();
        }
        this.applyText();
    }

    applyText() {
        if (!this.textKey) {
            this.captureTextKey();
        }
        if (!this.textKey) {
            return;
        }

        const translated = t(this.textKey);
        if (this.label) {
            this.label.string = translated;
        }
        if (this.richText) {
            this.richText.string = translated;
        }
        if (this.editBox) {
            this.editBox.placeholder = translated;
        }
    }

    private captureTextKey() {
        if (this.label?.string) {
            this.textKey = this.label.string;
            return;
        }

        if (this.richText?.string) {
            this.textKey = this.richText.string;
            return;
        }

        if (this.editBox?.placeholder) {
            this.textKey = this.editBox.placeholder;
        }
    }
}
