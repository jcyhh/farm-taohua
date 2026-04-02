import { assetManager, ImageAsset, SpriteFrame, Texture2D } from 'cc';

export class RemoteSpriteCache {
    private static readonly MAX_CACHE_SIZE = 80;
    private static readonly frameCache = new Map<string, SpriteFrame>();
    private static readonly pendingLoads = new Map<string, Promise<SpriteFrame | null>>();

    static async load(url: string): Promise<SpriteFrame | null> {
        const normalizedUrl = String(url ?? '').trim();
        if (!normalizedUrl) {
            return null;
        }

        const cachedFrame = this.frameCache.get(normalizedUrl);
        if (cachedFrame?.isValid) {
            this.touch(normalizedUrl, cachedFrame);
            return cachedFrame;
        }
        if (cachedFrame && !cachedFrame.isValid) {
            this.frameCache.delete(normalizedUrl);
        }

        const pending = this.pendingLoads.get(normalizedUrl);
        if (pending) {
            return pending;
        }

        const request = this.loadRemoteSpriteFrame(normalizedUrl)
            .then((spriteFrame) => {
                if (spriteFrame?.isValid) {
                    this.touch(normalizedUrl, spriteFrame);
                    this.evictIfNeeded();
                }
                return spriteFrame;
            })
            .finally(() => {
                this.pendingLoads.delete(normalizedUrl);
            });

        this.pendingLoads.set(normalizedUrl, request);
        return request;
    }

    static clear() {
        this.frameCache.clear();
        this.pendingLoads.clear();
    }

    private static touch(url: string, spriteFrame: SpriteFrame) {
        this.frameCache.delete(url);
        this.frameCache.set(url, spriteFrame);
    }

    private static evictIfNeeded() {
        while (this.frameCache.size > this.MAX_CACHE_SIZE) {
            const oldestKey = this.frameCache.keys().next().value;
            if (!oldestKey) {
                break;
            }
            this.frameCache.delete(oldestKey);
        }
    }

    private static loadRemoteSpriteFrame(url: string): Promise<SpriteFrame | null> {
        return new Promise((resolve, reject) => {
            assetManager.loadRemote<ImageAsset>(url, (error, imageAsset) => {
                if (error) {
                    reject(error);
                    return;
                }

                if (!imageAsset) {
                    resolve(null);
                    return;
                }

                const texture = new Texture2D();
                texture.image = imageAsset;

                const spriteFrame = new SpriteFrame();
                spriteFrame.texture = texture;
                resolve(spriteFrame);
            });
        });
    }
}
