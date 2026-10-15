import type { MatchResult, PlaylistTrack } from '../src/lib/playlist-protocol';
import { matchTrack } from './catalog';

// iTunes matches for playlist tracks, cached at the edge so a popular playlist
// doesn't spend the iTunes allowance again. Only definite answers are cached.

const DAY = 86_400;
const CACHE_ORIGIN = 'https://guess-in-a-beat.internal';

export async function cachedMatch(track: PlaylistTrack, country: string, waitUntil: (p: Promise<unknown>) => void): Promise<MatchResult> {
    const params = new URLSearchParams({ country, artist: track.artist, title: track.title, d: String(track.duration ?? '') });
    const key = new Request(`${CACHE_ORIGIN}/match?${params}`);
    const cache = caches.default;
    const hit = await cache.match(key).catch(() => undefined);
    if (hit) return (await hit.json()) as MatchResult;

    let result: MatchResult;
    try {
        const song = await matchTrack(track, country);
        result = song ? { status: 'found', song } : { status: 'missing' };
    } catch (err) {
        console.warn('match failed:', (err as Error).message);
        return { status: 'busy' }; // rate limited or unreachable: worth another try later
    }
    const res = new Response(JSON.stringify(result), {
        headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${result.status === 'found' ? 7 * DAY : DAY}` },
    });
    waitUntil(cache.put(key, res).catch(() => {}));
    return result;
}
