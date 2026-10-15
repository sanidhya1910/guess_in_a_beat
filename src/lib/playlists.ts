import { searchTracks } from './itunes';
import { MATCH_BATCH, type MatchResult, type Playlist, type PlaylistTrack } from './playlist-protocol';
import { findTrack } from './track-match';

// Browser side of playlist import. The server reads the playlist (neither
// Spotify nor YouTube allow it from the browser) and finds each picked track
// in the iTunes catalog, with the browser taking over when iTunes rate limits
// the server. Static hosts have no server, so import is unavailable
// there and says so.

const BASE = import.meta.env.BASE_URL;
const UNAVAILABLE = 'Playlist import is not available on this copy of the site.';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${BASE}${path}`, { ...init, signal: AbortSignal.timeout(30_000) });
    } catch {
        throw new Error('Could not reach the server. Check your connection and try again.');
    }
    const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!body) throw new Error(UNAVAILABLE);
    if (!res.ok) throw new Error(body.error ?? UNAVAILABLE);
    return body;
}

export function loadPlaylist(link: string): Promise<Playlist> {
    return call<Playlist>(`api/playlist?${new URLSearchParams({ url: link })}`);
}

/** Finds one track from the browser, at the visitor's own iTunes allowance. */
async function matchHere(track: PlaylistTrack, country: string): Promise<MatchResult> {
    try {
        const song = await findTrack(track, (term) => searchTracks(term, country));
        return song ? { status: 'found', song } : { status: 'missing' };
    } catch {
        return { status: 'busy' };
    }
}

/** Finds each track in the iTunes catalog, reporting results as they arrive.
 *  Results are in the order of `tracks`. The server answers from its cache in
 *  batches; when iTunes rate limits it, the rest are found from the browser
 *  one at a time, which is slower but uses the visitor's own allowance. */
export async function matchTracks(
    tracks: PlaylistTrack[],
    country: string,
    onBatch: (start: number, results: MatchResult[]) => void,
): Promise<void> {
    let serverBusy = false;
    for (let start = 0; start < tracks.length; start += MATCH_BATCH) {
        const batch = tracks.slice(start, start + MATCH_BATCH);
        const results: MatchResult[] = serverBusy
            ? batch.map(() => ({ status: 'busy' }))
            : (
                  await call<{ results: MatchResult[] }>('api/match', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ country, tracks: batch }),
                  })
              ).results;
        if (!results.some((r) => r.status === 'busy')) {
            onBatch(start, results);
            continue;
        }
        serverBusy = true;
        for (const [k, r] of results.entries()) {
            const result = r.status === 'busy' ? await matchHere(batch[k], country) : r;
            onBatch(start + k, [result]);
            // iTunes refuses this browser too: the rest would come back busy as well.
            if (result.status === 'busy') return;
        }
    }
}
