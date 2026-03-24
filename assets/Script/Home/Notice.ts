import { _decorator, Component, Node, Label, UITransform, tween, Vec3 } from 'cc';
import { Api, NoticeItem } from '../Config/Api';

const { ccclass, property } = _decorator;

@ccclass('Notice')
export class Notice extends Component {
    @property({ type: Node, tooltip: 'Label 节点(Mask 里面那个)' })
    labelNode: Node | null = null;

    @property({ tooltip: '显示时的 X 坐标' })
    showX = -375;

    @property({ tooltip: '右侧隐藏位置(初始)' })
    hideRightX = 380;

    @property({ tooltip: '左侧隐藏位置(退出)' })
    hideLeftX = -1130;

    @property({ tooltip: '公告滑入动画时长(秒)' })
    duration = 0.4;

    @property({ tooltip: '走马灯滚动速度(像素/秒)' })
    scrollSpeed = 80;

    @property({ tooltip: '走马灯循环间隔(秒)' })
    loopDelay = 1.0;

    private marqueeRunning = false;
    private label: Label | null = null;

    onLoad() {
        const pos = this.node.position;
        this.node.setPosition(this.hideRightX, pos.y, pos.z);
        this.label = this.labelNode?.getComponent(Label) ?? null;
    }

    async start() {
        const hasNotice = await this.loadNotice();
        if (!hasNotice) {
            this.node.active = false;
            return;
        }
        this.node.active = true;
        this.show();
    }

    show() {
        const pos = this.node.position;
        this.node.setPosition(this.hideRightX, pos.y, pos.z);

        tween(this.node)
            .to(this.duration, { position: new Vec3(this.showX, pos.y, pos.z) }, { easing: 'cubicOut' })
            .call(() => {
                this.startMarquee();
            })
            .start();
    }

    hide() {
        this.stopMarquee();
        const pos = this.node.position;

        tween(this.node)
            .to(this.duration, { position: new Vec3(this.hideLeftX, pos.y, pos.z) }, { easing: 'cubicIn' })
            .call(() => {
                this.node.setPosition(this.hideRightX, pos.y, pos.z);
            })
            .start();
    }

    private startMarquee() {
        if (!this.labelNode || this.marqueeRunning) return;
        this.marqueeRunning = true;
        this.runMarqueeLoop();
    }

    private stopMarquee() {
        this.marqueeRunning = false;
        if (this.labelNode) {
            tween(this.labelNode).stop();
        }
    }

    private runMarqueeLoop() {
        if (!this.labelNode || !this.marqueeRunning) return;

        const maskTrans = this.labelNode.parent?.getComponent(UITransform);
        const labelTrans = this.labelNode.getComponent(UITransform);
        if (!maskTrans || !labelTrans) return;

        const maskWidth = maskTrans.width;
        const labelWidth = labelTrans.width;

        const startX = 660;
        const endX = -(labelWidth + maskWidth * 0.5);
        const distance = startX - endX;
        const scrollDuration = distance / this.scrollSpeed;

        const pos = this.labelNode.position;
        this.labelNode.setPosition(startX, pos.y, pos.z);

        tween(this.labelNode)
            .to(scrollDuration, { position: new Vec3(endX, pos.y, pos.z) })
            .delay(this.loopDelay)
            .call(() => {
                this.runMarqueeLoop();
            })
            .start();
    }

    private async loadNotice(): Promise<boolean> {
        try {
            const response = await Api.notices();
            const firstNotice = this.pickFirstNotice(response);
            const title = firstNotice?.title?.trim() ?? '';

            if (!title) {
                return false;
            }

            if (this.label) {
                this.label.string = title;
            }
            return true;
        } catch (error) {
            console.error('[Notice] 获取公告失败:', error);
            return false;
        }
    }

    private pickFirstNotice(
        response: NoticeItem[] | { notices?: NoticeItem[]; list?: NoticeItem[]; data?: NoticeItem[] | { list?: NoticeItem[] } },
    ): NoticeItem | null {
        if (Array.isArray(response)) {
            return response[0] ?? null;
        }

        if (Array.isArray(response.notices)) {
            return response.notices[0] ?? null;
        }

        if (Array.isArray(response.data)) {
            return response.data[0] ?? null;
        }

        if (Array.isArray(response.list)) {
            return response.list[0] ?? null;
        }

        if (response.data && Array.isArray(response.data.list)) {
            return response.data.list[0] ?? null;
        }

        return null;
    }
}
