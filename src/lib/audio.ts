import { refreshPreview } from './itunes';
import type { Video } from './room-protocol';
import type { Song } from './types';
import { findVideos, youtube } from './youtube';

// Playback engine for 30-second iTunes previews.
//
// Previews are fetched and decoded into AudioBuffers (Apple serves them with
// CORS headers), which gives sample-accurate snippets: a 0.1 s clip is exactly
// 0.1 s, with short fades so it doesn't click. Apple's previews usually fade in,
// so snippets start at the first clearly audible moment instead of at 0.
// If decoding isn't possible, an <audio> element is used instead.
//
// Previews are cut from the middle of the song, though, so guessing snippets
// play the song's real opening from YouTube when its start has been measured
// (see youtube.ts). Other songs, and any that fail on YouTube, use the
// preview from its first audible moment. The preview also plays on the reveal.

export interface Prepared {
    song: Song;
    buffer?: AudioBuffer;
    media?: HTMLAudioElement;
    /** Where snippets start, in seconds into the preview. */
    offset: number;
    duration: number;
    /** YouTube videos of the full song, best match first, with where the music starts. */
    videos: Video[];
}

type Loaded = Omit<Prepared, 'videos'>;

class HttpError extends Error {}

const CACHE_LIMIT = 8;

function findAudibleStart(buffer: AudioBuffer): number {
    const data = buffer.getChannelData(0);
    const step = 0.05;
    const win = Math.floor(buffer.sampleRate * step);
    const levels: number[] = [];
    for (let i = 0; i + win <= data.length; i += win) {
        let sum = 0;
        for (let j = i; j < i + win; j += 4) sum += data[j] * data[j];
        levels.push(Math.sqrt(sum / (win / 4)));
    }
    const median = [...levels].sort((a, b) => a - b)[Math.floor(levels.length / 2)] ?? 0;
    const limit = Math.min(levels.length, Math.floor(5 / step));
    for (let k = 0; k < limit; k++) if (levels[k] >= median * 0.5) return k * step;
    return 0;
}

async function decode(data: ArrayBuffer): Promise<AudioBuffer> {
    // An OfflineAudioContext can decode before any user gesture without
    // tripping autoplay warnings.
    const Offline = window.OfflineAudioContext;
    if (!Offline) throw new Error('Web Audio unavailable');
    return new Offline(2, 44_100, 44_100).decodeAudioData(data);
}

function loadMedia(song: Song): Promise<Loaded> {
    return new Promise((resolve, reject) => {
        const el = new Audio();
        el.preload = 'auto';
        const timer = window.setTimeout(() => reject(new Error('Audio took too long to load')), 15_000);
        el.addEventListener(
            'canplaythrough',
            () => {
                window.clearTimeout(timer);
                resolve({ song, media: el, offset: 0, duration: el.duration || 30 });
            },
            { once: true },
        );
        el.addEventListener(
            'error',
            () => {
                window.clearTimeout(timer);
                reject(new HttpError('Audio failed to load'));
            },
            { once: true },
        );
        el.src = song.preview;
        el.load();
    });
}

async function load(song: Song): Promise<Loaded> {
    if (!song.preview) throw new HttpError('No preview');
    let data: ArrayBuffer;
    try {
        const res = await fetch(song.preview);
        if (!res.ok) throw new HttpError(`Preview responded ${res.status}`);
        data = await res.arrayBuffer();
    } catch (err) {
        if (err instanceof HttpError) throw err;
        return loadMedia(song); // network or CORS trouble: let <audio> try
    }
    try {
        const buffer = await decode(data);
        return { song, buffer, offset: findAudibleStart(buffer), duration: buffer.duration };
    } catch {
        return loadMedia(song); // codec unsupported by Web Audio
    }
}

interface Playback {
    stop(): void;
    elapsed(): number;
    length: number;
    /** Whether the sound runs through the analyser (Web Audio path only). */
    analysed: boolean;
}

class AudioEngine {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private analyserNode: AnalyserNode | null = null;
    private cache = new Map<string, Promise<Prepared>>();
    private current: Playback | null = null;
    private volume = 0.8;

    get analyser(): AnalyserNode | null {
        return this.current?.analysed ? this.analyserNode : null;
    }

    private context(): AudioContext | null {
        if (this.ctx) return this.ctx;
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        const ctx = new Ctor();
        const master = ctx.createGain();
        master.gain.value = this.volume;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.7;
        master.connect(analyser);
        analyser.connect(ctx.destination);
        // Let iOS play through the silent switch, like a music app.
        const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
        if (session) session.type = 'playback';
        this.ctx = ctx;
        this.master = master;
        this.analyserNode = analyser;
        return ctx;
    }

    /** Must be called synchronously inside a user gesture (click, key press). */
    unlock() {
        const ctx = this.context();
        if (ctx && ctx.state !== 'running') void ctx.resume();
    }

    /** Load a song. `videos` skips the YouTube lookup (multiplayer rooms resolve them on the server). */
    prepare(song: Song, country = 'us', videos?: Video[]): Promise<Prepared> {
        const key = `${song.id}:${videos?.map((v) => v.id).join(',') ?? ''}`;
        const hit = this.cache.get(key);
        if (hit) return hit;

        youtube.warm();
        const preview = load(song).catch(async (err) => {
            // Stored preview URLs can go stale; ask iTunes for the current one.
            if (!(err instanceof HttpError)) throw err;
            const fresh = await refreshPreview(song, country);
            if (!fresh || fresh === song.preview) throw err;
            return load({ ...song, preview: fresh });
        });
        const promise = Promise.all([preview, videos ?? findVideos(song)]).then(([p, videos]) => ({ ...p, videos }));
        this.cache.set(key, promise);
        promise.catch(() => this.cache.delete(key));
        if (this.cache.size > CACHE_LIMIT) this.cache.delete(this.cache.keys().next().value!);
        return promise;
    }

    /** Play the first `length` seconds of the song. */
    playSnippet(p: Prepared, length: number, onEnd: () => void) {
        const fromPreview = () => this.play(p, p.offset, Math.min(length, p.duration - p.offset), onEnd);
        if (!p.videos.length || !youtube.available) return fromPreview();

        this.stop();
        const clip = youtube.play(
            p.videos,
            length,
            () => {
                if (this.current !== playback) return;
                this.current = null;
                onEnd();
            },
            () => {
                if (this.current === playback) fromPreview();
            },
        );
        const playback: Playback = { length, analysed: false, elapsed: clip.elapsed, stop: clip.stop };
        this.current = playback;
    }

    /** Play the whole preview from the top. */
    playFull(p: Prepared, onEnd: () => void) {
        this.play(p, 0, p.duration, onEnd);
    }

    stop() {
        this.current?.stop();
        this.current = null;
    }

    /** Seconds into the current playback, or null when nothing is playing. */
    elapsed(): number | null {
        return this.current ? Math.min(this.current.elapsed(), this.current.length) : null;
    }

    setVolume(v: number) {
        this.volume = v;
        if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
        if (this.mediaEl) this.mediaEl.volume = v;
        youtube.setVolume(v);
    }

    private mediaEl: HTMLAudioElement | null = null;

    private play(p: Prepared, from: number, length: number, onEnd: () => void) {
        this.stop();
        const ctx = this.context();
        if (p.buffer && ctx && this.master) this.playBuffer(ctx, this.master, p.buffer, from, length, onEnd);
        else if (p.media) this.playMedia(p.media, from, length, onEnd);
        else onEnd();
    }

    private playBuffer(ctx: AudioContext, out: GainNode, buffer: AudioBuffer, from: number, length: number, onEnd: () => void) {
        if (ctx.state !== 'running') void ctx.resume();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        source.connect(gain).connect(out);

        const start = ctx.currentTime + 0.03;
        const fade = Math.min(0.012, length / 6);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(1, start + fade);
        gain.gain.setValueAtTime(1, start + length - fade);
        gain.gain.linearRampToValueAtTime(0, start + length);
        source.start(start, from, length);
        source.stop(start + length + 0.02);

        let finished = false;
        const playback: Playback = {
            length,
            analysed: true,
            elapsed: () => Math.max(0, ctx.currentTime - start),
            stop: () => {
                finished = true;
                try {
                    source.stop();
                } catch {
                    // already stopped
                }
                source.disconnect();
                gain.disconnect();
            },
        };
        source.onended = () => {
            if (finished) return;
            finished = true;
            source.disconnect();
            gain.disconnect();
            if (this.current === playback) this.current = null;
            onEnd();
        };
        this.current = playback;
    }

    private playMedia(el: HTMLAudioElement, from: number, length: number, onEnd: () => void) {
        this.mediaEl = el;
        el.volume = this.volume;
        el.currentTime = from;
        let raf = 0;
        let finished = false;
        const finish = (notify: boolean) => {
            if (finished) return;
            finished = true;
            cancelAnimationFrame(raf);
            el.pause();
            if (this.current === playback) this.current = null;
            if (notify) onEnd();
        };
        const tick = () => {
            if (el.ended || el.currentTime >= from + length) finish(true);
            else raf = requestAnimationFrame(tick);
        };
        const playback: Playback = {
            length,
            analysed: false,
            elapsed: () => Math.max(0, el.currentTime - from),
            stop: () => finish(false),
        };
        this.current = playback;
        el.play().then(() => (raf = requestAnimationFrame(tick)), () => finish(true));
    }
}

export const audio = new AudioEngine();
