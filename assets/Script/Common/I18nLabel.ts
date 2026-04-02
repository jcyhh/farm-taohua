import { _decorator, Component, Label, RichText } from 'cc';
import { t } from '../Config/I18n';

const { ccclass } = _decorator;

@ccclass('I18nLabel')
export class I18nLabel extends Component {
    private label: Label | null = null;
    private richText: RichText | null = null;
    private textKey = '';

    onLoad() {
        this.label = this.getComponent(Label);
        this.richText = this.getComponent(RichText);
        this.captureTextKey();
        this.applyText();
    }

    start() {
        this.applyText();
    }

    applyText() {
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
    }

    private captureTextKey() {
        if (this.label?.string) {
            this.textKey = this.label.string;
            return;
        }

        if (this.richText?.string) {
            this.textKey = this.richText.string;
        }
    }
}
