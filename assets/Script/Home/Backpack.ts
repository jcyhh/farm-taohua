import { _decorator, assetManager, Component, ImageAsset, instantiate, Label, Node, Prefab, Sprite, SpriteFrame, Texture2D, tween, Vec3 } from 'cc';
import { Api, MySeedItem } from '../Config/Api';

const { ccclass, property } = _decorator;

@ccclass('Backpack')
export class Backpack extends Component {
    private static _instance: Backpack | null = null;
    private static readonly imageCache = new Map<string, SpriteFrame>();

    @property({ type: Prefab, tooltip: '背包种子预设体' })
    bagSeedPrefab: Prefab | null = null;

    @property({ tooltip: '动画时长(秒)' })
    duration = 0.25;

    private readonly hideY = -253;
    private readonly showY = 92;
    private isTweening = false;
    private listContent: Node | null = null;

    static get instance(): Backpack | null {
        return Backpack._instance;
    }

    onLoad() {
        Backpack._instance = this;
        this.listContent = this.node.getChildByPath('list/view/content');
        if (!this.bagSeedPrefab) {
            console.error('[Backpack] 未绑定 bagSeedPrefab 预设体');
        }
        const pos = this.node.position;
        this.node.setPosition(pos.x, this.hideY, pos.z);
    }

    onDestroy() {
        if (Backpack._instance === this) {
            Backpack._instance = null;
        }
    }

    show() {
        void this.loadMySeed();
        this.slideTo(this.showY);
    }

    hide() {
        this.slideTo(this.hideY);
    }

    private slideTo(targetY: number) {
        tween(this.node).stop();
        this.isTweening = true;
        const pos = this.node.position;
        tween(this.node)
            .to(this.duration, { position: new Vec3(pos.x, targetY, pos.z) }, { easing: 'cubicOut' })
            .call(() => { this.isTweening = false; })
            .start();
    }

    private async loadMySeed() {
        try {
            const response = await Api.mySeed({ land_level: 1 });
            console.log('[Backpack] 我的种子列表:', response);
            this.renderSeedList(this.pickMySeedList(response));
        } catch (error) {
            console.error('[Backpack] 获取我的种子列表失败:', error);
        }
    }

    private pickMySeedList(response: MySeedItem[] | { data?: MySeedItem[]; list?: MySeedItem[] }): MySeedItem[] {
        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response.list)) {
            return response.list;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        return [];
    }

    private renderSeedList(list: MySeedItem[]) {
        if (!this.listContent || !this.bagSeedPrefab) return;

        for (const child of [...this.listContent.children]) {
            child.destroy();
        }

        for (const item of list) {
            const node = instantiate(this.bagSeedPrefab);
            node.active = true;
            this.listContent.addChild(node);
            this.fillSeedItem(node, item);
        }
    }

    private fillSeedItem(node: Node, item: MySeedItem) {
        const nameLabel = node.getChildByName('name')?.getComponent(Label) ?? null;
        const countLabel = node.getChildByPath('number/count')?.getComponent(Label) ?? null;
        const seedSprite = node.getChildByPath('img/seed')?.getComponent(Sprite) ?? null;

        if (nameLabel) {
            nameLabel.string = item.seed?.seed_name || '';
        }
        if (countLabel) {
            countLabel.string = String(item.amount ?? 0);
        }

        void this.loadRemoteSprite(seedSprite, String(item.seed?.seed_img ?? ''));
    }

    private async loadRemoteSprite(sprite: Sprite | null, url: string) {
        if (!sprite) return;

        if (!url) {
            sprite.spriteFrame = null;
            return;
        }

        const cachedFrame = Backpack.imageCache.get(url);
        if (cachedFrame) {
            sprite.spriteFrame = cachedFrame;
            return;
        }

        try {
            const imageAsset = await this.loadRemoteImage(url);
            if (!imageAsset) return;

            const texture = new Texture2D();
            texture.image = imageAsset;

            const spriteFrame = new SpriteFrame();
            spriteFrame.texture = texture;
            Backpack.imageCache.set(url, spriteFrame);
            sprite.spriteFrame = spriteFrame;
        } catch (error) {
            console.error(`[Backpack] 加载种子图片失败: ${url}`, error);
        }
    }

    private loadRemoteImage(url: string): Promise<ImageAsset | null> {
        return new Promise((resolve, reject) => {
            assetManager.loadRemote<ImageAsset>(url, (error, imageAsset) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(imageAsset ?? null);
            });
        });
    }
}
