import { artistsOverlap, songKey } from './match';
import type { Song } from './types';

// Browser client for the iTunes Search API. It is free, needs no key, sends
// CORS headers and works worldwide, but allows only about 20 requests per
// minute per IP. Requests are cached and budgeted so search-as-you-type stays
// under that limit; once the budget is spent a RateLimitError is thrown and
// callers fall back to local suggestions.

const API = 'https://itunes.apple.com';
const BUDGET_PER_MINUTE = 18;
const CACHE_LIMIT = 150;

export class RateLimitError extends Error {
    constructor() {
        super('Too many searches. Try again in a moment.');
        this.name = 'RateLimitError';
    }
}

export interface RawTrack {
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

interface RawResponse {
    results: RawTrack[];
}

const cache = new Map<string, Promise<RawResponse>>();
const sent: number[] = [];
let cooldownUntil = 0;

function request(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<RawResponse> {
    const url = `${API}${path}?${new URLSearchParams(params)}`;
    const hit = cache.get(url);
    if (hit) return hit;

    const now = Date.now();
    while (sent.length && now - sent[0] > 60_000) sent.shift();
    if (now < cooldownUntil || sent.length >= BUDGET_PER_MINUTE) return Promise.reject(new RateLimitError());
    sent.push(now);

    const promise = fetch(url, { signal }).then(async (res) => {
        if (res.status === 403 || res.status === 429) {
            cooldownUntil = Date.now() + 60_000;
            throw new RateLimitError();
        }
        if (!res.ok) throw new Error(`iTunes responded ${res.status}`);
        return (await res.json()) as RawResponse;
    });
    cache.set(url, promise);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    promise.catch(() => cache.delete(url));
    return promise;
}

export function toSong(r: RawTrack): Song {
    let url = r.trackViewUrl;
    if (url) {
        try {
            const u = new URL(url);
            u.searchParams.delete('uo');
            url = u.toString();
        } catch {
            // keep as-is
        }
    }
    return {
        id: r.trackId,
        title: r.trackName,
        artist: r.artistName,
        album: r.collectionName ?? '',
        artwork: r.artworkUrl100 ?? '',
        preview: r.previewUrl ?? '',
        year: r.releaseDate ? new Date(r.releaseDate).getUTCFullYear() : undefined,
        genre: r.primaryGenreName,
        url,
        duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : undefined,
    };
}

const isTrack = (r: RawTrack) => r.wrapperType === 'track' && r.kind === 'song';

function uniqueSongs(songs: Song[]): Song[] {
    const seen = new Set<string>();
    return songs.filter((s) => {
        const key = songKey(s);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/** Song search for guesses. Duplicate releases of a song are collapsed. */
export async function searchSongs(term: string, country: string, signal?: AbortSignal): Promise<Song[]> {
    const data = await request('/search', { term, country, entity: 'song', limit: '12' }, signal);
    return uniqueSongs(data.results.filter(isTrack).map(toSong));
}

/** Milliseconds until another request fits the budget. */
function budgetWait(): number {
    const now = Date.now();
    while (sent.length && now - sent[0] > 60_000) sent.shift();
    if (now < cooldownUntil) return cooldownUntil - now;
    return sent.length >= BUDGET_PER_MINUTE ? sent[0] + 60_000 - now : 0;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Raw song search for matching playlist tracks. Unlike search-as-you-type it
 *  waits for the budget instead of failing, and gives up with a
 *  RateLimitError only if iTunes itself still refuses after a cooldown. */
export async function searchTracks(term: string, country: string): Promise<RawTrack[]> {
    for (let refused = 0; ; ) {
        const wait = budgetWait();
        if (wait > 0) await sleep(wait + 100);
        try {
            return (await request('/search', { term, country, entity: 'song', limit: '15' })).results;
        } catch (err) {
            // A refusal from iTunes starts a cooldown; losing the budget to a
            // guess search typed meanwhile does not, and just waits again.
            if (!(err instanceof RateLimitError) || (Date.now() < cooldownUntil && ++refused > 1)) throw err;
        }
    }
}

/** Look tracks up by id, preserving the order of `ids`. */
export async function lookupSongs(ids: number[], country: string): Promise<Song[]> {
    const found = new Map<number, Song>();
    for (let i = 0; i < ids.length; i += 150) {
        const data = await request('/lookup', { id: ids.slice(i, i + 150).join(','), country, entity: 'song' });
        for (const r of data.results) if (r.wrapperType === 'track') found.set(r.trackId, toSong(r));
    }
    return ids.map((id) => found.get(id)).filter((s): s is Song => !!s);
}

export interface ArtistResult {
    id: number;
    name: string;
    artwork: string;
    genre?: string;
}

/** Artists matching a name, each with artwork from their top song. Artists
 *  with no songs in the store are left out. */
export async function searchArtists(term: string, country: string, signal?: AbortSignal): Promise<ArtistResult[]> {
    const found = await request('/search', { term, country, entity: 'musicArtist', limit: '10' }, signal);
    const artists = found.results.filter((r) => r.wrapperType === 'artist' && r.artistId);
    if (!artists.length) return [];

    // A multi-id lookup lists each artist followed by their top song. The song
    // can carry a shared credit's id ("Pritam & Arijit Singh"), so pair it with
    // the artist row before it rather than by id.
    const tops = await request(
        '/lookup',
        { id: artists.map((a) => a.artistId).join(','), country, entity: 'song', limit: '1' },
        signal,
    );
    const artwork = new Map<number, string>();
    let current: number | undefined;
    for (const r of tops.results) {
        if (r.wrapperType === 'artist') current = r.artistId;
        else if (current && r.artworkUrl100 && !artwork.has(current)) artwork.set(current, r.artworkUrl100);
    }

    return artists
        .filter((a) => artwork.has(a.artistId!))
        .slice(0, 8)
        .map((a) => ({ id: a.artistId!, name: a.artistName, artwork: artwork.get(a.artistId!)!, genre: a.primaryGenreName }));
}

/** An artist's most popular songs that have previews. Songs where they are
 *  only a featured guest on someone else's track are left out. */
export async function artistSongs(artistId: number, country: string): Promise<{ name: string; songs: Song[] }> {
    const data = await request('/lookup', { id: String(artistId), country, entity: 'song', limit: '200' });
    const name = data.results.find((r) => r.wrapperType === 'artist')?.artistName;
    const songs = data.results
        .filter((r) => isTrack(r) && r.previewUrl)
        .filter((r) => r.artistId === artistId || (!!name && artistsOverlap(r.artistName, name)))
        .map(toSong);
    return { name: name ?? songs[0]?.artist ?? 'Unknown artist', songs: uniqueSongs(songs) };
}

/** Fetch a fresh preview URL when a stored one has expired. */
export async function refreshPreview(song: Song, country: string): Promise<string | null> {
    try {
        const [fresh] = await lookupSongs([song.id], country);
        return fresh?.preview || null;
    } catch {
        return null;
    }
}

/** Resize an iTunes artwork URL (they accept any NxN size). */
export function artworkAt(url: string, size: number): string {
    return url.replace(/\/\d+x\d+bb\./, `/${size}x${size}bb.`);
}
