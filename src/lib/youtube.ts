import { introFor } from './intros';
import type { Video } from './room-protocol';
import type { Song } from './types';

// Plays a song's real opening from YouTube. iTunes previews are cut from the
// middle of a track, so they can't do "name it from the first beat".
//
// Only songs whose start was measured ahead of time (scripts/build-intros.ts)
// play from YouTube, starting after any silence at the top of the video, so
// even a 0.1 s clip has music in it.
//
// A single hidden IFrame player is reused. Timing runs from the moment the
// player reports it is playing, which is accurate to a few tens of
// milliseconds. Anything that goes wrong (no match, embedding disabled, the
// browser refusing to start playback) is reported through `onFail` so the
// caller can fall back to the iTunes preview.

const API_SRC = 'https://www.youtube.com/iframe_api';

/** Time allowed for the player to show any sign of life before giving up. */
const START_TIMEOUT = 1_800;
/** Time allowed for buffering once the player has started loading. */
const BUFFER_TIMEOUT = 7_000;

const State = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

interface Player {
    loadVideoById(args: { videoId: string; startSeconds?: number }): void;
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    setVolume(volume: number): void;
    unMute(): void;
}

interface PlayerEvent {
    data: number;
}

interface YTNamespace {
    Player: new (
        el: HTMLElement,
        options: {
            width: number;
            height: number;
            playerVars: Record<string, string | number>;
            events: {
                onReady: () => void;
                onStateChange: (e: PlayerEvent) => void;
                onError: (e: PlayerEvent) => void;
            };
        },
    ) => Player;
}

declare global {
    interface Window {
        YT?: YTNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}

/** The YouTube video for a song's opening, where the start of its music has
 *  been measured. Songs without a measurement play from the iTunes preview,
 *  which is trimmed in the browser, rather than risk silence at the top of a
 *  video. Never rejects. */
export async function findVideos(song: Song): Promise<Video[]> {
    const intro = await introFor(song.id);
    return intro ? [intro] : [];
}

export interface YouTubePlayback {
    stop(): void;
    /** Seconds since the audio started, 0 while still loading. */
    elapsed(): number;
}

interface Attempt {
    videos: Video[];
    index: number;
    length: number;
    started: number | null;
    loading: boolean;
    timer: number;
    onEnd: () => void;
    onFail: () => void;
}

class YouTubeClips {
    private player: Promise<Player> | null = null;
    private loaded: Video | null = null;
    private attempt: Attempt | null = null;
    private volume = 80;
    private bad = new Set<string>();
    /** Set once the browser has refused to start playback (common on iOS). */
    private blocked = false;
    private played = false;

    get available(): boolean {
        return !this.blocked;
    }

    /** Load the IFrame API and create the player ahead of the first play. */
    warm() {
        void this.ready().catch(() => {});
    }

    setVolume(v: number) {
        this.volume = Math.round(v * 100);
        void this.player?.then((p) => p.setVolume(this.volume)).catch(() => {});
    }

    play(videos: Video[], length: number, onEnd: () => void, onFail: () => void): YouTubePlayback {
        this.cancel();
        const attempt: Attempt = {
            videos: videos.filter((v) => !this.bad.has(v.id)),
            index: 0,
            length,
            started: null,
            loading: false,
            timer: 0,
            onEnd,
            onFail,
        };
        this.attempt = attempt;
        const fail = () => this.fail(attempt);
        if (!attempt.videos.length) {
            window.setTimeout(fail);
        } else {
            attempt.timer = window.setTimeout(fail, START_TIMEOUT + 4_000); // covers loading the API itself
            this.ready().then(
                (p) => this.attempt === attempt && this.start(p, attempt),
                () => this.attempt === attempt && fail(),
            );
        }
        return {
            stop: () => this.attempt === attempt && this.cancel(),
            elapsed: () => (attempt.started === null ? 0 : (performance.now() - attempt.started) / 1000),
        };
    }

    private start(p: Player, a: Attempt) {
        const video = a.videos[a.index];
        window.clearTimeout(a.timer);
        a.timer = window.setTimeout(() => {
            // Nothing happened at all: the browser won't let us start playback.
            if (!this.played) this.blocked = true;
            this.fail(a);
        }, START_TIMEOUT);
        p.unMute();
        p.setVolume(this.volume);
        if (this.loaded?.id === video.id) {
            p.seekTo(video.start, true);
            p.playVideo();
        } else {
            p.loadVideoById({ videoId: video.id, startSeconds: video.start });
        }
        this.loaded = video;
    }

    private onState(p: Player, state: number) {
        const a = this.attempt;
        if (!a) {
            // A play that was cancelled while loading has just begun; silence it.
            if (state === State.PLAYING) p.pauseVideo();
            return;
        }
        if (state === State.BUFFERING && !a.loading && a.started === null) {
            a.loading = true;
            window.clearTimeout(a.timer);
            a.timer = window.setTimeout(() => this.fail(a), BUFFER_TIMEOUT);
        } else if (state === State.PLAYING && a.started === null) {
            this.played = true;
            a.started = performance.now();
            window.clearTimeout(a.timer);
            a.timer = window.setTimeout(() => this.finish(a), a.length * 1000);
        } else if (state === State.ENDED && a.started !== null) {
            this.finish(a);
        }
    }

    private onError(p: Player) {
        const a = this.attempt;
        if (!a) return;
        // Usually "embedding disabled by the owner". Try the next candidate.
        this.bad.add(a.videos[a.index].id);
        this.loaded = null;
        a.index++;
        if (a.index < a.videos.length && a.started === null) this.start(p, a);
        else this.fail(a);
    }

    private finish(a: Attempt) {
        if (this.attempt !== a) return;
        this.halt();
        a.onEnd();
    }

    private fail(a: Attempt) {
        if (this.attempt !== a) return;
        this.halt();
        a.onFail();
    }

    private cancel() {
        if (this.attempt) this.halt();
    }

    private halt() {
        const a = this.attempt;
        if (a) window.clearTimeout(a.timer);
        this.attempt = null;
        void this.player
            ?.then((p) => {
                p.pauseVideo();
                // Park at the start so a replay begins without buffering.
                if (this.loaded) p.seekTo(this.loaded.start, true);
            })
            .catch(() => {});
    }

    private ready(): Promise<Player> {
        this.player ??= loadApi().then(
            (YT) =>
                new Promise<Player>((resolve, reject) => {
                    const host = document.createElement('div');
                    host.setAttribute('aria-hidden', 'true');
                    // Kept inside the viewport (offscreen iframes can be throttled), but invisible.
                    host.style.cssText =
                        'position:fixed;right:0;bottom:0;width:200px;height:200px;opacity:0;pointer-events:none;z-index:-1;overflow:hidden';
                    const mount = document.createElement('div');
                    host.appendChild(mount);
                    document.body.appendChild(host);
                    const timer = window.setTimeout(() => reject(new Error('YouTube player did not load')), 10_000);
                    const player: Player = new YT.Player(mount, {
                        width: 200,
                        height: 200,
                        playerVars: {
                            controls: 0,
                            disablekb: 1,
                            fs: 0,
                            playsinline: 1,
                            rel: 0,
                            iv_load_policy: 3,
                            origin: location.origin,
                        },
                        events: {
                            onReady: () => {
                                window.clearTimeout(timer);
                                player.setVolume(this.volume);
                                resolve(player);
                            },
                            onStateChange: (e) => this.onState(player, e.data),
                            onError: () => this.onError(player),
                        },
                    });
                }),
        );
        this.player.catch(() => (this.player = null));
        return this.player;
    }
}

let api: Promise<YTNamespace> | null = null;

function loadApi(): Promise<YTNamespace> {
    api ??= new Promise<YTNamespace>((resolve, reject) => {
        if (window.YT?.Player) return resolve(window.YT);
        const previous = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            previous?.();
            if (window.YT) resolve(window.YT);
        };
        const script = document.createElement('script');
        script.src = API_SRC;
        script.async = true;
        script.onerror = () => reject(new Error('YouTube API failed to load'));
        document.head.appendChild(script);
    });
    api.catch(() => (api = null));
    return api;
}

export const youtube = new YouTubeClips();
