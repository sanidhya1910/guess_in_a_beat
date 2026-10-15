// Finds where each song really starts on YouTube:
//
//   src/data/intros.json   { "<iTunes id>": ["<YouTube video id>", <seconds of leading silence>] }
//
// Many uploads open with a moment (sometimes several seconds) of silence, which
// would make a 0.1 s snippet silent. The game can't measure that in the browser
// (the YouTube player is a cross-origin iframe), so it is measured here: the
// first seconds of the audio are streamed through ffmpeg's silencedetect.
//
// Requires yt-dlp (recent; YouTube breaks old versions) and ffmpeg on PATH, or
// set YTDLP / FFMPEG to their paths. Usage:
//
//   node scripts/build-intros.ts          songs from every pack and the Daily
//   node scripts/build-intros.ts --retry    also retry songs that failed before
//   node scripts/build-intros.ts --recheck  re-measure songs with a lead-in over
//                                           0.5 s on the same video (after tuning)
//   node scripts/build-intros.ts --repick   search again for songs whose video was
//                                           picked by an older version of the search
//
// Videos longer than the studio track (by more than MAX_EXTRA_SECONDS) are
// skipped: the extra is usually a non-music intro, which silence detection
// can't see. The search prefers art tracks, which are the studio audio itself.
//
// Results are cached in scripts/.cache/intros.json, so re-runs only measure new
// songs. Songs without an entry fall back to the runtime lookup with no skip.

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DailyData, Song } from '../src/lib/types.ts';
import { findVideos, MAX_EXTRA_SECONDS } from '../worker/youtube.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'src/data');
const OUT_FILE = path.join(DATA_DIR, 'intros.json');
const CACHE_FILE = path.join(ROOT, 'scripts/.cache/intros.json');
const YTDLP = process.env.YTDLP || 'yt-dlp';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const RETRY = process.argv.includes('--retry');
const RECHECK = process.argv.includes('--recheck');
const REPICK = process.argv.includes('--repick');
/** Bumped when the video search changes, so --repick knows which picks are stale. */
const PICK_VERSION = 2;
const RECHECK_OVER = 0.5;
const CONCURRENCY = 3;

/** Seconds of audio examined; a longer silence is treated as this long. */
const WINDOW = 12;
/** Quieter than this counts as silence. At -50 dB soft openings (the a cappella
 *  start of "Bohemian Rhapsody") were mistaken for silence; -60 dB only catches
 *  real silence and tape hiss. */
const NOISE_FLOOR = '-60dB';

type Entry = { video: string; lead: number; pick?: number } | { failed: string };

function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, { maxBuffer: 8 << 20, timeout: 60_000, windowsHide: true }, (err, stdout, stderr) => {
            if (err) reject(Object.assign(err, { stderr }));
            else resolve({ stdout, stderr });
        });
    });
}

/** The video's audio stream, or null if it can't be embedded or is too long to be just the song. */
async function audioUrl(video: string, songLength?: number): Promise<string | null> {
    const { stdout } = await run(YTDLP, [
        '--no-warnings',
        '--js-runtimes',
        'node',
        '-f',
        '251/140/bestaudio',
        '--print',
        '%(playable_in_embed)s|%(duration)s|%(url)s',
        `https://www.youtube.com/watch?v=${video}`,
    ]);
    const [embeddable, length, url] = stdout.trim().split('|');
    if (songLength && Number(length) - songLength > MAX_EXTRA_SECONDS) return null;
    return embeddable === 'True' && url ? url : null;
}

/** Seconds of silence at the very start of the audio. */
async function leadingSilence(url: string): Promise<number> {
    const { stderr } = await run(FFMPEG, [
        '-hide_banner',
        '-nostats',
        '-t',
        String(WINDOW),
        '-i',
        url,
        '-af',
        `silencedetect=noise=${NOISE_FLOOR}:d=0.02`,
        '-f',
        'null',
        '-',
    ]);
    const start = stderr.match(/silence_start: (-?[\d.]+)/);
    if (!start || Number(start[1]) > 0.02) return 0;
    const end = stderr.match(/silence_end: ([\d.]+)/);
    // Nothing audible in the whole window: almost always a stream that didn't read properly.
    if (!end || Number(end[1]) >= WINDOW - 0.05) throw new Error('no audio in the first seconds');
    return Number(end[1]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** YouTube drops the odd connection under load; try a few times before giving up. */
async function withRetries<T>(task: () => Promise<T>, tries = 4): Promise<T> {
    for (let i = 1; ; i++) {
        try {
            return await task();
        } catch (err) {
            if (i >= tries) throw err;
            await sleep(1500 * 2 ** i);
        }
    }
}

async function measure(song: Song, preferred?: string, known?: Entry): Promise<Entry> {
    const videos = preferred ? [preferred] : await withRetries(() => findVideos(song.artist, song.title, song.duration));
    if (!videos.length) return { failed: 'no match' };
    for (const video of videos) {
        // The search picked the video measured before: nothing to redo.
        if (known && 'video' in known && known.video === video) return { ...known, pick: PICK_VERSION };
        // Not embeddable (the player couldn't use it either), too long or the stream won't read: try the next one.
        const url = await withRetries(() => audioUrl(video, song.duration), 2).catch(() => null);
        if (!url) continue;
        const lead = await withRetries(() => leadingSilence(url), 2).catch(() => null);
        if (lead === null) continue;
        return { video, lead: Math.round(lead * 100) / 100, pick: PICK_VERSION };
    }
    return { failed: 'no usable video' };
}

async function allSongs(): Promise<Song[]> {
    const songs = new Map<number, Song>();
    const packDir = path.join(DATA_DIR, 'packs');
    for (const file of await readdir(packDir)) {
        const pack = JSON.parse(await readFile(path.join(packDir, file), 'utf8')) as Song[];
        for (const s of pack) songs.set(s.id, s);
    }
    const daily = JSON.parse(await readFile(path.join(DATA_DIR, 'daily.json'), 'utf8')) as DailyData;
    for (const c of daily.categories) for (const s of c.songs) songs.set(s.id, s);
    return [...songs.values()];
}

async function main() {
    const cache: Record<string, Entry> = existsSync(CACHE_FILE) ? JSON.parse(await readFile(CACHE_FILE, 'utf8')) : {};
    const songs = await allSongs();
    const todo = songs.filter((s) => {
        const hit = cache[s.id];
        return (
            !hit ||
            (RETRY && 'failed' in hit) ||
            (RECHECK && 'video' in hit && hit.lead > RECHECK_OVER) ||
            (REPICK && 'video' in hit && hit.pick !== PICK_VERSION)
        );
    });
    console.log(`${songs.length} songs, ${todo.length} to measure`);

    const save = async () => {
        await mkdir(path.dirname(CACHE_FILE), { recursive: true });
        await writeFile(CACHE_FILE, JSON.stringify(cache));
        const out: Record<string, [string, number]> = {};
        for (const s of songs) {
            const e = cache[s.id];
            if (e && 'video' in e) out[s.id] = [e.video, e.lead];
        }
        await writeFile(OUT_FILE, `${JSON.stringify(out)}\n`);
    };

    let done = 0;
    let failed = 0;
    let next = 0;
    const worker = async () => {
        while (next < todo.length) {
            const song = todo[next++];
            let entry: Entry;
            const hit = cache[song.id];
            try {
                entry = REPICK ? await measure(song, undefined, hit) : await measure(song, RECHECK && hit && 'video' in hit ? hit.video : undefined);
                // A recheck that can't read the same video again falls back to a fresh search.
                if (RECHECK && 'failed' in entry) entry = await measure(song);
            } catch (err) {
                const e = err as Error & { cause?: Error };
                entry = { failed: `${e.message} ${e.cause?.message ?? ''}`.split('\n')[0].slice(0, 120) };
                // YouTube had a hiccup: keep the old pick for now, and repick it on the next run.
                if (REPICK && hit && 'video' in hit) entry = hit;
            }
            cache[song.id] = entry;
            done++;
            if ('failed' in entry) failed++;
            const detail = 'video' in entry ? `${entry.lead.toFixed(2)}s` : `FAILED (${entry.failed})`;
            console.log(`[${done}/${todo.length}] ${song.artist} - ${song.title}: ${detail}`);
            if (done % 25 === 0) await save();
        }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    await save();
    console.log(`Done. ${done - failed} measured, ${failed} failed. Wrote ${path.relative(ROOT, OUT_FILE)}`);
}

await main();
