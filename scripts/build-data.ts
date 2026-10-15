// Builds the static song data the site ships with:
//
//   src/data/catalog.json        pack list (titles, counts, cover art)
//   src/data/packs/<id>.json     songs in each pack
//   src/data/daily.json          Daily Challenge rotation per category (append-only)
//   src/data/artists.json        one-tap artists for Artist mode
//
// Usage:
//   node scripts/build-data.ts            everything (slow: ~20 iTunes calls/min)
//   node scripts/build-data.ts --charts   refresh only the Top 100 charts (fast)
//   node scripts/build-data.ts --daily    rebuild only the Daily Challenge
//
// Search results are cached in scripts/.cache so re-runs only fetch new seeds.

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DAILY_EPOCH } from '../src/lib/daily.ts';
import { artistsOverlap, normalizeTitle, songKey, splitArtists } from '../src/lib/match.ts';
import type { ArtistPick, DailyCategory, DailyData, PackInfo, Song } from '../src/lib/types.ts';
import { ARTISTS, CHARTS, CURATED, DAILY_CATEGORIES, DAILY_MIN_YEAR, type CuratedPack, type DailyCategorySeed } from './seeds.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'src/data');
const PACK_DIR = path.join(DATA_DIR, 'packs');
const CACHE_FILE = path.join(ROOT, 'scripts/.cache/itunes.json');
const CHARTS_ONLY = process.argv.includes('--charts');
const DAILY_ONLY = process.argv.includes('--daily');

// iTunes allows roughly 20 requests per minute per IP.
const GAP_MS = 3200;

interface ItunesTrack {
    wrapperType?: string;
    kind?: string;
    trackId: number;
    artistId?: number;
    trackName: string;
    artistName: string;
    collectionName?: string;
    artworkUrl100?: string;
    previewUrl?: string;
    releaseDate?: string;
    primaryGenreName?: string;
    trackViewUrl?: string;
    trackTimeMillis?: number;
}

interface ItunesResponse {
    resultCount: number;
    results: ItunesTrack[];
}

// ── HTTP ────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let cache: Record<string, ItunesResponse> = {};
let lastRequest = 0;
let dirty = 0;

async function loadCache() {
    if (existsSync(CACHE_FILE)) cache = JSON.parse(await readFile(CACHE_FILE, 'utf8'));
}

async function saveCache() {
    await mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(cache));
    dirty = 0;
}

async function itunes(query: string, useCache: boolean): Promise<ItunesResponse> {
    if (useCache && cache[query]) return cache[query];
    for (let attempt = 1; attempt <= 6; attempt++) {
        const wait = lastRequest + GAP_MS - Date.now();
        if (wait > 0) await sleep(wait);
        lastRequest = Date.now();
        try {
            const res = await fetch(`https://itunes.apple.com${query}`);
            if (res.ok) {
                const json = (await res.json()) as ItunesResponse;
                if (useCache) {
                    cache[query] = json;
                    if (++dirty >= 10) await saveCache();
                }
                return json;
            }
            console.warn(`  iTunes ${res.status}, backing off (attempt ${attempt})`);
        } catch (err) {
            console.warn(`  network error: ${(err as Error).message} (attempt ${attempt})`);
        }
        await sleep(20_000 * attempt);
    }
    throw new Error(`iTunes request kept failing: ${query}`);
}

const qs = (params: Record<string, string>) => '?' + new URLSearchParams(params).toString();

async function lookup(ids: (string | number)[], country: string): Promise<Map<number, ItunesTrack>> {
    const found = new Map<number, ItunesTrack>();
    for (let i = 0; i < ids.length; i += 150) {
        const chunk = ids.slice(i, i + 150).join(',');
        const data = await itunes(`/lookup${qs({ id: chunk, country, entity: 'song' })}`, false);
        for (const r of data.results) if (r.wrapperType === 'track') found.set(r.trackId, r);
    }
    return found;
}

// ── Mapping ─────────────────────────────────────────────────────────────────

function toSong(r: ItunesTrack): Song | null {
    if (!r.previewUrl || !r.artworkUrl100) return null;
    // Apple Music links are rebuilt from the id at runtime, so they aren't stored.
    return {
        id: r.trackId,
        title: r.trackName,
        artist: r.artistName,
        album: r.collectionName ?? '',
        artwork: r.artworkUrl100,
        preview: r.previewUrl,
        year: r.releaseDate ? new Date(r.releaseDate).getUTCFullYear() : undefined,
        // Lets the YouTube lookup skip uploads with a non-music intro.
        duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : undefined,
    };
}

// Recordings that would make a bad quiz clip, never chosen.
const REJECT =
    /\b(karaoke|tribute|covers?|lullab(y|ies)|instrumental|sped[\s-]?up|slowed|reverb|nightcore|8[\s-]?bit|in the style of|originally performed|made famous|string quartet|piano version|workout|bpm)\b/i;
const REJECT_ARTIST = /\b(tribute|karaoke|lullaby|rockabye|string quartet|cover band|in the style of|piano dreamers)\b/i;
// Alternate takes: allowed only when nothing better exists.
const REMIXED = /\b(remix|rework|club|dub|extended|mix|megamix|medley|mashup)\b/i;
const EDITED = /\b(?<!(radio|single|album)\s)edit\b/i;
const LIVE = /\b(live|unplugged|acoustic|demo|session|rehearsal|stripped)\b/i;
const VERSION = /\b(?<!(taylor's|single|album|original|stereo|mono|lp|radio|us|uk|english|explicit|clean)\s)version\b/i;
const COMPILATION = /\b(greatest hits|best of|collection|essential|anthology|now that'?s|hits)\b/i;
const MIN_SCORE = 100;

function looseArtistMatch(candidate: string, wanted: string): boolean {
    if (artistsOverlap(candidate, wanted)) return true;
    const a = ` ${splitArtists(candidate).join(' ')} `;
    const b = ` ${splitArtists(wanted).join(' ')} `;
    return a.includes(b) || b.includes(a);
}

interface Scored {
    /** Title, artist and recording-type fit; must reach MIN_SCORE. */
    quality: number;
    /** Tie-breakers between acceptable recordings. */
    rank: number;
}

function scoreCandidate(r: ItunesTrack, artist: string, title: string): Scored | null {
    const want = normalizeTitle(title);
    const got = normalizeTitle(r.trackName);
    let quality: number;
    if (got === want) quality = 100;
    else if (got.startsWith(`${want} `) || want.startsWith(`${got} `)) quality = 50;
    else return null;

    if (REJECT_ARTIST.test(r.artistName) || !looseArtistMatch(r.artistName, artist)) return null;
    quality += artistsOverlap(r.artistName, artist) ? 50 : 30;

    // Penalise a qualifier only when the seed title doesn't contain it
    // ("Live and Let Die", "Piano Man").
    const label = `${r.trackName} ${r.collectionName ?? ''}`.replace(/[\u2018\u2019]/g, "'");
    const seed = title.toLowerCase();
    const has = (re: RegExp) => {
        const m = re.exec(label);
        return !!m && !seed.includes(m[0].toLowerCase());
    };
    if (has(REJECT)) return null;
    if (has(REMIXED) || has(EDITED)) quality -= 60;
    if (has(LIVE)) quality -= 60;
    if (has(VERSION)) quality -= 40;

    // Prefer the original release: remasters keep the original date, while
    // re-issues and compilations come later. Then albums over singles.
    const year = r.releaseDate ? new Date(r.releaseDate).getUTCFullYear() : 2030;
    let rank = quality + Math.max(0, 2030 - year) * 0.3;
    if (COMPILATION.test(r.collectionName ?? '')) rank -= 3;
    if (/ - Single$/.test(r.collectionName ?? '')) rank -= 3;
    if (r.trackName === title) rank += 2;
    return { quality, rank };
}

function pickBest(results: ItunesTrack[], artist: string, title: string): ItunesTrack | null {
    let best: { r: ItunesTrack; rank: number } | null = null;
    for (const r of results) {
        if (r.kind !== 'song' || !r.previewUrl) continue;
        const s = scoreCandidate(r, artist, title);
        if (s && s.quality >= MIN_SCORE && (!best || s.rank > best.rank)) best = { r, rank: s.rank };
    }
    return best?.r ?? null;
}

async function resolveSeed(line: string, country: string): Promise<Song | null> {
    const [artist, title] = line.split('|').map((s) => s.trim());
    const term = `${splitArtists(artist).slice(0, 2).join(' ')} ${title}`.replace(/[()[\]]/g, ' ');
    const data = await itunes(`/search${qs({ term, entity: 'song', limit: '15', country })}`, true);
    let best = pickBest(data.results, artist, title);
    if (!best) {
        // The artist + title search sometimes surfaces only remixes and live
        // cuts; a wider title-only search usually finds the original.
        const wide = await itunes(
            `/search${qs({ term: title.replace(/[()[\]]/g, ' '), entity: 'song', attribute: 'songTerm', limit: '50', country })}`,
            true,
        );
        best = pickBest(wide.results, artist, title);
    }
    return best ? toSong(best) : null;
}

function dedupe(songs: Song[]): Song[] {
    const seen = new Set<string>();
    return songs.filter((s) => {
        const key = songKey(s);
        if (seen.has(key) || seen.has(String(s.id))) return false;
        seen.add(key).add(String(s.id));
        return true;
    });
}

function packInfo(
    meta: { id: string; title: string; blurb: string; country: string },
    category: PackInfo['category'],
    songs: Song[],
    updated?: string,
): PackInfo {
    // Cover collage: four songs from different albums.
    const covers: string[] = [];
    const albums = new Set<string>();
    for (const s of songs) {
        if (albums.has(s.artwork)) continue;
        albums.add(s.artwork);
        covers.push(s.artwork);
        if (covers.length === 4) break;
    }
    return { id: meta.id, title: meta.title, blurb: meta.blurb, category, country: meta.country, count: songs.length, covers, updated };
}

async function writeJson(file: string, data: unknown) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(data, null, 1) + '\n');
}

async function readJson<T>(file: string): Promise<T | null> {
    return existsSync(file) ? (JSON.parse(await readFile(file, 'utf8')) as T) : null;
}

// ── Builders ────────────────────────────────────────────────────────────────

async function buildChart(meta: (typeof CHARTS)[number]): Promise<PackInfo> {
    console.log(`chart ${meta.id}`);
    const feedUrl = `https://rss.marketingtools.apple.com/api/v2/${meta.country}/music/most-played/100/songs.json`;
    let res = await fetch(feedUrl);
    for (let attempt = 1; !res.ok && res.status >= 500 && attempt <= 3; attempt++) {
        await sleep(5000 * attempt);
        res = await fetch(feedUrl);
    }
    if (!res.ok) throw new Error(`Apple charts feed returned ${res.status} for ${meta.country}`);
    const feed = (await res.json()) as { feed: { results: { id: string }[] } };
    const ids = feed.feed.results.map((r) => r.id);
    const tracks = await lookup(ids, meta.country);
    const songs = dedupe(
        ids.map((id) => tracks.get(Number(id))).flatMap((t) => (t ? [toSong(t)].filter((s): s is Song => !!s) : [])),
    );
    await writeJson(path.join(PACK_DIR, `${meta.id}.json`), songs);
    console.log(`  ${songs.length} songs`);
    return packInfo(meta, 'charts', songs, new Date().toISOString().slice(0, 10));
}

async function buildCurated(pack: CuratedPack): Promise<{ info: PackInfo; songs: Song[] }> {
    const lines = pack.songs.split('\n').map((l) => l.trim()).filter((l) => l.includes('|'));
    console.log(`pack ${pack.id} (${lines.length} seeds)`);
    const songs: Song[] = [];
    for (const line of lines) {
        const song = await resolveSeed(line, pack.country);
        if (song) songs.push(song);
        else console.warn(`  no match: ${line}`);
    }
    const unique = dedupe(songs);
    await writeJson(path.join(PACK_DIR, `${pack.id}.json`), unique);
    console.log(`  ${unique.length} songs`);
    return { info: packInfo(pack, pack.category, unique), songs: unique };
}

async function buildArtists(): Promise<ArtistPick[]> {
    const picks: ArtistPick[] = [];
    for (const { name, country } of ARTISTS) {
        const data = await itunes(
            `/search${qs({ term: name, entity: 'song', attribute: 'artistTerm', limit: '10', country })}`,
            true,
        );
        const want = splitArtists(name).join(' ');
        let hit = data.results.find((r) => splitArtists(r.artistName).join(' ') === want && r.artistId);
        if (!hit) {
            // Artists who mostly appear in shared credits ("Pritam & Arijit Singh")
            // need an artist search, then one of their songs for artwork.
            const found = await itunes(`/search${qs({ term: name, entity: 'musicArtist', limit: '3', country })}`, true);
            const artist = found.results.find((r) => splitArtists(r.artistName).join(' ') === want);
            if (artist?.artistId) {
                const songs = await itunes(`/lookup${qs({ id: String(artist.artistId), entity: 'song', limit: '1', country })}`, true);
                const top = songs.results.find((r) => r.wrapperType === 'track');
                if (top) hit = { ...top, artistId: artist.artistId, artistName: artist.artistName };
            }
        }
        if (!hit || !hit.artistId || !hit.artworkUrl100) {
            console.warn(`  artist not found: ${name}`);
            continue;
        }
        picks.push({ id: hit.artistId, name: hit.artistName, artwork: hit.artworkUrl100, genre: hit.primaryGenreName, country });
    }
    return picks;
}

// Each category's rotation is append-only so a given date always maps to the
// same song, even after the list grows. Existing entries get refreshed
// metadata; new songs are shuffled onto the end.
async function buildDailyCategory(seed: DailyCategorySeed, existing: DailyCategory | undefined): Promise<DailyCategory> {
    const lines = seed.songs.split('\n').map((l) => l.trim()).filter((l) => l.includes('|'));
    console.log(`daily ${seed.id} (${lines.length} seeds)`);
    const resolved: Song[] = [];
    const perArtist = new Map<string, number>();
    for (const line of lines) {
        const song = await resolveSeed(line, seed.country);
        if (!song) {
            console.warn(`  no match: ${line}`);
            continue;
        }
        // The catalog year can be a later re-release, so this is a backstop for
        // the hand-picked list rather than the rule itself.
        if (!song.year || song.year < DAILY_MIN_YEAR) {
            console.warn(`  before ${DAILY_MIN_YEAR}, left out: ${line} (${song.year ?? 'no year'})`);
            continue;
        }
        const lead = splitArtists(line.split('|')[0])[0] ?? '';
        perArtist.set(lead, (perArtist.get(lead) ?? 0) + 1);
        resolved.push(song);
    }
    for (const [artist, n] of perArtist) if (n > 2) console.warn(`  ${artist} leads ${n} songs; the lists aim for at most 2`);

    const byId = new Map(resolved.map((s) => [s.id, s]));
    const songs = (existing?.songs ?? []).map((s) => byId.get(s.id) ?? s);
    const scheduled = new Set(songs.map(songKey));
    const fresh = dedupe(resolved).filter((s) => !scheduled.has(songKey(s)));
    for (let i = fresh.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
    }
    console.log(`  ${songs.length + fresh.length} songs (${fresh.length} new)`);
    return { id: seed.id, title: seed.title, blurb: seed.blurb, songs: [...songs, ...fresh] };
}

async function buildDaily(): Promise<void> {
    const file = path.join(DATA_DIR, 'daily.json');
    const existing = await readJson<Partial<DailyData>>(file);
    const previous = new Map((existing?.categories ?? []).map((c) => [c.id, c]));
    const categories: DailyCategory[] = [];
    for (const seed of DAILY_CATEGORIES) categories.push(await buildDailyCategory(seed, previous.get(seed.id)));
    await writeJson(file, { epoch: existing?.epoch ?? DAILY_EPOCH, categories } satisfies DailyData);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
    await loadCache();
    if (DAILY_ONLY) {
        await buildDaily();
        await saveCache();
        return;
    }
    const catalogFile = path.join(DATA_DIR, 'catalog.json');
    const previous = (await readJson<PackInfo[]>(catalogFile)) ?? [];
    const infos = new Map(previous.map((p) => [p.id, p]));

    for (const chart of CHARTS) {
        try {
            infos.set(chart.id, await buildChart(chart));
        } catch (err) {
            // Keep the last good snapshot if the feed is down.
            console.warn(`  chart ${chart.id} failed: ${(err as Error).message}`);
        }
    }

    if (!CHARTS_ONLY) {
        for (const pack of CURATED) infos.set(pack.id, (await buildCurated(pack)).info);
        await saveCache();
        await buildDaily();
        await writeJson(path.join(DATA_DIR, 'artists.json'), await buildArtists());
    }

    const order = [...CHARTS.map((c) => c.id), ...CURATED.map((c) => c.id)];
    const catalog = order.map((id) => infos.get(id)).filter((p): p is PackInfo => !!p);
    await writeJson(catalogFile, catalog);
    await saveCache();
    console.log(`catalog: ${catalog.length} packs`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
