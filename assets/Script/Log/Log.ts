import { _decorator, Color, Component, director, instantiate, Label, Node, Prefab, ScrollView } from 'cc';
import { Api, TreeBattleRecordsResponse } from '../Config/Api';
import { t } from '../Config/I18n';
import { formatAmount } from '../Utils/Format';
const { ccclass, property } = _decorator;

@ccclass('Log')
export class Log extends Component {
    private static readonly SCENE_NAME = 'Log';
    private static pendingType: 1 | 2 = 1;
    private static readonly PAGE_LOAD_GAP = 80;
    private static readonly INCREASE_COLOR = new Color(0x5E, 0x21, 0x1A, 0xFF);
    private static readonly DECREASE_COLOR = new Color(0xFF, 0x00, 0x84, 0xFF);

    @property({ type: Prefab, tooltip: '日志预设体' })
    itemPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: 'ScrollView content 节点' })
    contentNode: Node | null = null;

    @property({ tooltip: '每页数量' })
    pageSize = 20;

    private scrollView: ScrollView | null = null;
    private pageNo = 1;
    private loading = false;
    private hasMore = true;

    static open(type?: number | string) {
        this.pendingType = this.normalizeType(type);
        director.loadScene(this.SCENE_NAME);
    }

    static getPendingType() {
        return this.pendingType;
    }

    onLoad() {
        this.scrollView = this.getComponent(ScrollView);
        this.contentNode = this.contentNode ?? this.scrollView?.content ?? this.node.getChildByPath('view/content') ?? null;
        this.node.on('scrolling', this.onScrolling, this);
    }

    onDestroy() {
        this.safeOff(this.node, 'scrolling', this.onScrolling);
    }

    start() {
        void this.reload();
    }

    private async reload() {
        this.pageNo = 1;
        this.hasMore = true;
        this.clearList();

        if (this.scrollView) {
            this.scrollView.stopAutoScroll();
            this.scrollView.scrollToTop(0);
        }

        await this.loadNextPage();
    }

    private async loadNextPage() {
        if (this.loading || !this.hasMore) return;

        this.loading = true;
        try {
            const response = await Api.treeBattleRecords({
                page_no: this.pageNo,
                page_size: this.pageSize,
            });
            console.log('[Log] 对战记录返回:', response);
            const list = this.pickTreeBattleRecordList(response);
            this.renderList(list);
            this.hasMore = this.pickHasMore(response, list.length);
            if (list.length > 0) {
                this.pageNo += 1;
            }
        } catch (error) {
            console.error('[Log] 获取对战记录失败:', error);
        } finally {
            this.loading = false;
        }
    }

    private onScrolling() {
        if (!this.scrollView || this.loading || !this.hasMore) return;

        const maxOffset = this.scrollView.getMaxScrollOffset();
        const offset = this.scrollView.getScrollOffset();
        if (maxOffset.y <= 0) return;
        if (offset.y >= maxOffset.y - Log.PAGE_LOAD_GAP) {
            void this.loadNextPage();
        }
    }

    private pickTreeBattleRecordList(response: TreeBattleRecordsResponse | Record<string, any>[]) {
        if (Array.isArray(response)) {
            return response;
        }
        if (Array.isArray(response.list)) {
            return response.list;
        }
        if (Array.isArray(response.data)) {
            return response.data;
        }
        if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.list)) {
            return response.data.list;
        }
        return [];
    }

    private pickHasMore(response: TreeBattleRecordsResponse, currentSize: number) {
        if (currentSize < this.pageSize) {
            return false;
        }

        const total = Number(response.total ?? NaN);
        if (Number.isFinite(total) && total >= 0 && this.contentNode) {
            return this.contentNode.children.length < total;
        }

        return currentSize >= this.pageSize;
    }

    private renderList(list: Record<string, any>[]) {
        if (!this.contentNode || !this.itemPrefab || list.length === 0) return;

        for (const item of list) {
            const node = instantiate(this.itemPrefab);
            node.active = true;
            this.contentNode.addChild(node);
            this.fillItem(node, item);
        }
    }

    private fillItem(node: Node, item: Record<string, any>) {
        const myLabel = node.getChildByName('my')?.getComponent(Label) ?? null;
        const otherLabel = node.getChildByName('other')?.getComponent(Label) ?? null;
        const myPowerLabel = node.getChildByName('myPower')?.getComponent(Label) ?? null;
        const otherPowerLabel = node.getChildByName('otherPower')?.getComponent(Label) ?? null;
        const myAmountLabel = node.getChildByName('myAmount')?.getComponent(Label) ?? null;
        const otherAmountLabel = node.getChildByPath('otherAmount/Label')?.getComponent(Label) ?? null;
        const timeLabel = node.getChildByName('time')?.getComponent(Label) ?? null;
        const failNode = node.getChildByName('fail');
        const successNode = node.getChildByName('success');
        const failLabel = failNode?.getComponent(Label)
            ?? failNode?.getChildByName('Label')?.getComponent(Label)
            ?? null;

        const me = this.pickObject(item.me);
        const opponent = this.pickObject(item.opponent);
        const winner = Number(item.winner);

        if (myLabel) {
            myLabel.string = String(me?.mphone ?? '');
        }
        if (otherLabel) {
            otherLabel.string = String(opponent?.mphone ?? '');
        }
        if (myPowerLabel) {
            myPowerLabel.string = this.getPowerText(me?.spirits);
        }
        if (otherPowerLabel) {
            otherPowerLabel.string = this.getPowerText(opponent?.spirits);
        }
        if (myAmountLabel) {
            myAmountLabel.string = this.getIncomeText(me?.income);
        }
        if (otherAmountLabel) {
            otherAmountLabel.string = this.getIncomeText(opponent?.income);
        }
        if (timeLabel) {
            timeLabel.string = String(item.created_at ?? '');
        }

        if (successNode) {
            successNode.active = winner === 1;
        }
        if (failNode) {
            failNode.active = winner === 0 || winner === 2;
        }
        if (failLabel) {
            failLabel.string = winner === 0 ? t('平局') : t('失败');
        }
    }

    private getPowerText(spirits: any) {
        return t('战力 {spirits}', {
            spirits: Array.isArray(spirits) ? spirits.join() : '',
        });
    }

    private getIncomeText(value: number | string | undefined) {
        const amount = Number(value);
        if (!Number.isFinite(amount)) {
            return String(value ?? '0');
        }
        const amountText = formatAmount(Math.abs(amount));
        if (amount > 0) {
            return `+${amountText}`;
        }
        if (amount < 0) {
            return `-${amountText}`;
        }
        return '0';
    }

    private pickObject(value: any) {
        if (!value || Array.isArray(value) || typeof value !== 'object') {
            return null;
        }
        return value as Record<string, any>;
    }

    private clearList() {
        if (!this.contentNode) return;
        for (const child of [...this.contentNode.children]) {
            child.destroy();
        }
    }

    private static normalizeType(type?: number | string): 1 | 2 {
        return String(type) === '2' ? 2 : 1;
    }

    private safeOff(node: Node | null | undefined, eventType: string, callback: (...args: any[]) => void) {
        const target = node as any;
        if (!target?.isValid || !target._eventProcessor) {
            return;
        }
        target.off(eventType, callback, this);
    }
}

