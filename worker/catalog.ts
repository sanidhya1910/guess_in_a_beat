// Finds the iTunes release of a playlist track from the server, using the
// matching in src/lib/track-match.ts.
//
// Shared by the Worker and the Vite dev server.

import type { RawTrack } from '../src/lib/itunes';
import type { PlaylistTrack } from '../src/lib/playlist-protocol';
import { findTrack } from '../src/lib/track-match';
import type { Song } from '../src/lib/types';

async function search(term: string, country: string): Promise<RawTrack[]> {
    const params = new URLSearchParams({ term, country, entity: 'song', limit: '15' });
    const res = await fetch(`https://itunes.apple.com/search?${params}`);
    // 403 and 429 mean rate limiting: about 20 requests a minute are allowed per
    // IP, and Cloudflare's shared IPs are often over that already.
    if (!res.ok) throw new Error(`iTunes responded ${res.status}`);
    return ((await res.json()) as { results?: RawTrack[] }).results ?? [];
}

/** The iTunes song for a playlist track, or null when the catalog doesn't have it. */
export function matchTrack(track: PlaylistTrack, country: string): Promise<Song | null> {
    return findTrack(track, (term) => search(term, country));
}
