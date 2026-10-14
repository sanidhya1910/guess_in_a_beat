// Finds YouTube uploads of a song that start at the true beginning of the
// track. iTunes previews are cut from the middle of a song, so the game plays
// the opening seconds from YouTube instead.
//
// The best source is the song's "art track": the upload of the studio
// recording that YouTube Music lists as a song. It is exactly the album audio,
// so it never opens with a music-video skit, film dialogue or crowd noise.
// Those come from YouTube Music's song search. When that finds nothing usable,
// the regular YouTube search fills in, and there the song's length (from
// iTunes) rules out uploads with extra material in front of the music.
//
// Neither has a keyless API, so this uses what their web apps use. The video
// search runs in scripts/build-intros.ts, which also measures where the music
// starts; the YouTube Music client is shared with playlist import.

import { artistsOverlap, normalizeTitle } from '../src/lib/match.ts';

interface Candidate {
    id: string;
    title: string;
    /** Credited artists on YouTube Music, the uploading channel on YouTube. */
    artist: string;
    seconds: number;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const SEARCH_HEADERS = {
    'accept-language': 'en-US,en;q=0.9',
    // Skips the EU cookie-consent interstitial.
    cookie: 'SOCS=CAI',
    'user-agent': USER_AGENT,
};

const MUSIC_CLIENT = { clientName: 'WEB_REMIX', clientVersion: '1.20250101.01.00', hl: 'en', gl: 'US' };
/** YouTube Music search filter: songs only. */
const SONGS_ONLY = 'EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D';

/** An upload this many seconds longer than the studio track has something
 *  else in it, nearly always a non-music intro (a skit, a film scene, a
 *  talking head), so it is not used. */
export const MAX_EXTRA_SECONDS = 8;

// Words that mark a different recording or a video with a non-musical intro,
// unless the song title itself contains them.
const OFF_VERSION =
    /\b(live|remix|cover|karaoke|instrumental|sped|slowed|reverb|8d|nightcore|reaction|lyrics?|acoustic|mashup|teaser|trailer|tutorial|piano|extended|loop|hours?|scene|dialogue|making)\b/;

function normalize(s: string): string {
    return s
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[([]\s*(feat|ft|with)\b[^)\]]*[)\]]/g, '')
        .replace(/\b(feat|ft)\b.*$/, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

function toSeconds(length: string): number {
    return length.split(':').reduce((total, part) => total * 60 + Number(part), 0);
}

// ── YouTube Music ───────────────────────────────────────────────────────────

interface Runs {
    runs?: { text: string }[];
}

const text = (r?: Runs) => (r?.runs ?? []).map((x) => x.text).join('');

/** One call to YouTube Music's web API (`search`, `browse`, ...). */
export async function musicApi(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`https://music.youtube.com/youtubei/v1/${endpoint}?prettyPrint=false`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://music.youtube.com', 'user-agent': USER_AGENT },
        body: JSON.stringify({ context: { client: MUSIC_CLIENT }, ...body }),
    });
    if (!res.ok) throw new Error(`YouTube Music responded ${res.status}`);
    return res.json();
}

export interface MusicItem extends Candidate {
    /** MUSIC_VIDEO_TYPE_ATV (art track), _OMV (official video), _UGC (any other upload), ... */
    type: string;
}

interface ListItem {
    flexColumns?: { musicResponsiveListItemFlexColumnRenderer?: { text?: Runs } }[];
    fixedColumns?: { musicResponsiveListItemFixedColumnRenderer?: { text?: Runs & { simpleText?: string } } }[];
    playlistItemData?: { videoId?: string };
}

/** The songs and videos listed in a YouTube Music response, in page order. */
export function musicItems(data: unknown): MusicItem[] {
    const out: MusicItem[] = [];
    const walk = (node: unknown) => {
        if (!node || typeof node !== 'object') return;
        const item = (node as { musicResponsiveListItemRenderer?: ListItem }).musicResponsiveListItemRenderer;
        if (!item) {
            for (const value of Object.values(node)) walk(value);
            return;
        }
        const id = item.playlistItemData?.videoId;
        const [title = '', meta = ''] = (item.flexColumns ?? []).map((c) => text(c.musicResponsiveListItemFlexColumnRenderer?.text));
        // Search rows read "Artist • Album • 3:43"; playlist rows put the length in a fixed column.
        const parts = meta.split(' • ');
        const fixed = item.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text;
        const length = (fixed && (text(fixed) || fixed.simpleText)) || parts.find((p) => /^\d+(:\d\d)+$/.test(p)) || '';
        const type = JSON.stringify(item).match(/"musicVideoType":"(\w+)"/)?.[1] ?? '';
        if (id && title) out.push({ id, title, artist: parts[0] ?? '', seconds: length ? toSeconds(length) : 0, type });
    };
    walk(data);
    return out;
}

async function searchMusic(artist: string, title: string, duration?: number): Promise<string[]> {
    const data = await musicApi('search', { query: `${artist} ${title}`, params: SONGS_ONLY });
    const wanted = normalizeTitle(title);
    const offVersion = OFF_VERSION.test(title.toLowerCase());
    const scored: { id: string; s: number }[] = [];
    musicItems(data)
        .slice(0, 8)
        .forEach((c, rank) => {
            const name = normalizeTitle(c.title);
            if (name !== wanted && !name.startsWith(`${wanted} `) && !wanted.startsWith(`${name} `)) return;
            if (!artistsOverlap(c.artist, artist)) return;
            if (!offVersion && OFF_VERSION.test(c.title.toLowerCase())) return;
            let s = 10 - rank + (name === wanted ? 6 : 0);
            if (duration && c.seconds) {
                // A different length is a different edit (radio, album, extended), which can open differently.
                const delta = Math.abs(c.seconds - duration);
                s += delta <= 3 ? 8 : delta <= MAX_EXTRA_SECONDS ? 2 : -8;
            }
            scored.push({ id: c.id, s });
        });
    return scored.sort((a, b) => b.s - a.s).map((c) => c.id);
}

// ── YouTube search ──────────────────────────────────────────────────────────

interface VideoRenderer {
    videoId?: string;
    lengthText?: { simpleText?: string };
    title?: Runs;
    ownerText?: Runs;
}

function collect(node: unknown, out: Candidate[]) {
    if (!node || typeof node !== 'object') return;
    const video = (node as { videoRenderer?: VideoRenderer }).videoRenderer;
    if (video) {
        const length = video.lengthText?.simpleText;
        if (video.videoId && length) {
            out.push({
                id: video.videoId,
                title: text(video.title),
                artist: video.ownerText?.runs?.[0]?.text ?? '',
                seconds: toSeconds(length),
            });
        }
        return;
    }
    for (const value of Object.values(node)) collect(value, out);
}

function score(c: Candidate, rank: number, artist: string, title: string, duration?: number): number {
    const name = normalize(c.title);
    const extra = name.replace(title, ' ').replace(artist, ' ');
    const leadArtist = artist.split(' ')[0];
    let s = -rank * 2;
    if (!name.includes(title.split(' ').slice(0, 3).join(' '))) s -= 30;
    if (OFF_VERSION.test(extra) && !OFF_VERSION.test(title)) s -= 40;
    if (name === title) s += 25; // an auto-generated "art track": the studio audio, nothing else
    if (/\baudio\b/.test(extra)) s += 20;
    if (/official (music )?video|\bmv\b|full (video|song)/.test(extra)) s -= 8; // videos often open with a skit
    const channel = normalize(c.artist);
    if (channel.includes(leadArtist) || /\b(topic|vevo)\b/.test(channel)) s += 10;
    if (duration && Math.abs(c.seconds - duration) <= 3) s += 15; // the same length as the studio track
    return s;
}

async function searchVideos(artist: string, title: string, duration?: number): Promise<string[]> {
    const query = `${artist} ${title} audio`;
    const res = await fetch(`https://www.youtube.com/results?hl=en&gl=US&search_query=${encodeURIComponent(query)}`, {
        headers: SEARCH_HEADERS,
    });
    if (!res.ok) throw new Error(`YouTube search responded ${res.status}`);
    const html = await res.text();
    const json = html.match(/var ytInitialData = (\{.*?\});<\/script>/s)?.[1];
    if (!json) throw new Error('YouTube search page had no results data');

    const found: Candidate[] = [];
    collect(JSON.parse(json), found);
    const a = normalize(artist);
    const t = normalize(title);
    return found
        .slice(0, 12)
        .map((c, rank) => ({ c, s: score(c, rank, a, t, duration) }))
        .filter(({ c, s }) => c.seconds >= 60 && c.seconds <= 720 && s > -30)
        // Longer than the studio track: the extra is usually a non-music intro.
        .filter(({ c }) => !duration || c.seconds - duration <= MAX_EXTRA_SECONDS)
        .sort((x, y) => y.s - x.s)
        .map(({ c }) => c.id);
}

/** Up to three video ids, best match first. `duration` is the studio track's
 *  length in seconds, when known. Throws if YouTube can't be read. */
export async function findVideos(artist: string, title: string, duration?: number): Promise<string[]> {
    let songs: string[] = [];
    try {
        songs = await searchMusic(artist, title, duration);
    } catch {
        // fall back to the regular search
    }
    // A second candidate covers an art track whose owner has disabled embedding.
    if (songs.length >= 2) return songs.slice(0, 3);
    let videos: string[];
    try {
        videos = await searchVideos(artist, title, duration);
    } catch (err) {
        if (songs.length) return songs;
        throw err;
    }
    return [...new Set([...songs, ...videos])].slice(0, 3);
}
