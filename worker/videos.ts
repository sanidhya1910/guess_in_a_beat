import { findVideos } from './youtube';

// YouTube lookups cached at the edge, shared by /api/yt and multiplayer rooms.
// A failed lookup (usually YouTube rate limiting) returns null and isn't cached.

const DAY = 86_400;
const CACHE_ORIGIN = 'https://guess-in-a-beat.internal';

export async function cachedVideos(
    artist: string,
    title: string,
    duration: number | undefined,
    waitUntil: (p: Promise<unknown>) => void,
): Promise<string[] | null> {
    // "yt2": picks made before art tracks and track lengths were used aren't reused.
    const params = new URLSearchParams({ artist, title, d: String(duration ?? '') });
    const key = new Request(`${CACHE_ORIGIN}/yt2?${params}`);
    const cache = caches.default;
    const hit = await cache.match(key).catch(() => undefined);
    if (hit) return (await hit.json()) as string[];

    let ids: string[];
    try {
        ids = await findVideos(artist, title, duration);
    } catch {
        return null;
    }
    const res = new Response(JSON.stringify(ids), {
        headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${ids.length ? 30 * DAY : DAY}` },
    });
    waitUntil(cache.put(key, res).catch(() => {}));
    return ids;
}
