import { _decorator, Component, AudioClip, AudioSource, Director, director, resources } from 'cc';
import { Storage } from '../Utils/Storage';

const { ccclass, property } = _decorator;

const BGM_KEY = 'bgmOn';
const SFX_KEY = 'sfxOn';
type AudioKey = 'bgm' | 'click' | 'gold' | 'fruit' | 'open' | 'upgrade' | 'upgrade1' | 'upgrade2' | 'attack' | 'win' | 'fail' | 'draw';
const AUDIO_PATHS: Record<AudioKey, string> = {
    bgm: 'Audio/bgm',
    click: 'Audio/click',
    gold: 'Audio/gold',
    fruit: 'Audio/du',
    open: 'Audio/open',
    upgrade: 'Audio/upgrade',
    upgrade1: 'Audio/upgrade1',
    upgrade2: 'Audio/upgrade2',
    attack: 'Audio/attack',
    win: 'Audio/win',
    fail: 'Audio/fail',
    draw: 'Audio/draw',
};

@ccclass('AudioManager')
export class AudioManager extends Component {
    @property({ tooltip: '音效音量' })
    sfxVolume = 1.0;

    private bgmSource: AudioSource | null = null;
    private sfxSource: AudioSource | null = null;
    private readonly clips: Partial<Record<AudioKey, AudioClip>> = {};
    private preloadPromise: Promise<void> | null = null;
    private readonly ensureBgmPlayback = () => {
        if (!this.bgmSource?.clip) return;

        if (!Storage.getBool(BGM_KEY, true)) {
            this.bgmSource.pause();
            return;
        }

        if (!this.bgmSource.playing) {
            this.bgmSource.play();
        }
    };

    private static _instance: AudioManager | null = null;
    static get instance(): AudioManager | null {
        return AudioManager._instance;
    }

    onLoad() {
        if (AudioManager._instance) {
            this.node.destroy();
            return;
        }
        AudioManager._instance = this;
        director.addPersistRootNode(this.node);
        director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this.ensureBgmPlayback, this);

        this.bgmSource = this.bgmSource ?? this.getComponent(AudioSource) ?? null;
        if (this.bgmSource) {
            this.bgmSource.playOnAwake = false;
            this.bgmSource.clip = null;
        }
        this.sfxSource = this.node.addComponent(AudioSource);
    }

    onDestroy() {
        if (AudioManager._instance === this) {
            AudioManager._instance = null;
        }
        director.off(Director.EVENT_AFTER_SCENE_LAUNCH, this.ensureBgmPlayback, this);
    }

    preloadAudios() {
        if (this.preloadPromise) {
            return this.preloadPromise;
        }

        const tasks = Object.keys(AUDIO_PATHS).map((key) => this.loadClip(key as AudioKey));
        this.preloadPromise = Promise.all(tasks)
            .then(() => {
                if (this.bgmSource) {
                    this.bgmSource.clip = this.clips.bgm ?? null;
                }
                this.ensureBgmPlayback();
            })
            .catch((error) => {
                this.preloadPromise = null;
                throw error;
            });

        return this.preloadPromise;
    }

    private loadClip(key: AudioKey) {
        if (this.clips[key]) {
            return Promise.resolve(this.clips[key] as AudioClip);
        }

        return new Promise<AudioClip>((resolve, reject) => {
            resources.load(AUDIO_PATHS[key], AudioClip, (error, clip) => {
                if (error || !clip) {
                    reject(error ?? new Error(`[AudioManager] 音频加载失败: ${key}`));
                    return;
                }
                this.clips[key] = clip;
                resolve(clip);
            });
        });
    }

    playClick() {
        this.playSfx(this.clips.click ?? null);
    }

    playGold() {
        this.playSfx(this.clips.gold ?? null);
    }

    playFruit() {
        this.playSfx(this.clips.fruit ?? null);
    }

    playOpen() {
        this.playSfx(this.clips.open ?? null);
    }

    playUpgrade() {
        this.playSfx(this.clips.upgrade ?? null);
    }

    playUpgrade1() {
        this.playSfx(this.clips.upgrade1 ?? null);
    }

    playUpgrade2() {
        this.playSfx(this.clips.upgrade2 ?? null);
    }

    playAttack() {
        this.playSfx(this.clips.attack ?? null);
    }

    playWin() {
        this.playSfx(this.clips.win ?? null);
    }

    playFail() {
        this.playSfx(this.clips.fail ?? null);
    }

    playDraw() {
        this.playSfx(this.clips.draw ?? null);
    }

    playSfx(clip: AudioClip | null) {
        if (!clip || !this.sfxSource) return;
        if (!Storage.getBool(SFX_KEY, true)) return;

        this.sfxSource.playOneShot(clip, this.sfxVolume);
    }

    setBgmOn(isOn: boolean) {
        Storage.setBool(BGM_KEY, isOn);
        if (!this.bgmSource) return;

        if (isOn) {
            this.bgmSource.play();
        } else {
            this.bgmSource.pause();
        }
    }

    setSfxOn(isOn: boolean) {
        Storage.setBool(SFX_KEY, isOn);
    }

    get isBgmOn(): boolean {
        return Storage.getBool(BGM_KEY, true);
    }

    get isSfxOn(): boolean {
        return Storage.getBool(SFX_KEY, true);
    }
}
