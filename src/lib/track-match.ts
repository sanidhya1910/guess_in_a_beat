// Finds the iTunes (Apple Music) release of a track from a Spotify or YouTube
// playlist. Challenges are made of iTunes songs: they have the 30-second
// previews, artwork and ids that challenge links carry.
//
// The search itself is passed in, so the same matching runs in the Worker and,
// when iTunes rate limits the Worker, in the browser (src/lib/playlists.ts).

import { type RawTrack, toSong } from './itunes';
import { artistsOverlap, normalizeTitle, splitArtists } from './match';
import type { PlaylistTrack } from './playlist-protocol';
import type { Song } from './types';

/** An iTunes song search: up to 15 results for a term. */
export type SongSearch = (term: string) => Promise<RawTrack[]>;

// Recordings that would make a bad quiz clip, unless the track itself is one.
const REJECT = /\b(karaoke|tribute|in the style of|originally performed|made famous|lullab(y|ies)|8[\s-]?bit|instrumental|cover)\b/i;

function pick(results: RawTrack[], track: PlaylistTrack): RawTrack | null {
    const title = normalizeTitle(track.title);
    const rejectable = !REJECT.test(track.title);
    let best: RawTrack | null = null;
    let bestScore = 0;
    for (const [rank, r] of results.entries()) {
        if (r.wrapperType !== 'track' || r.kind !== 'song' || !r.previewUrl) continue;
        if (rejectable && (REJECT.test(r.trackName) || REJECT.test(r.artistName) || REJECT.test(r.collectionName ?? ''))) continue;
        const name = normalizeTitle(r.trackName);
        const sameTitle = name === title;
        if (!sameTitle && !name.startsWith(`${title} `) && !title.startsWith(`${name} `)) continue;
        const sameArtist = artistsOverlap(r.artistName, track.artist);
        const delta = track.duration && r.trackTimeMillis ? Math.abs(r.trackTimeMillis / 1000 - track.duration) : undefined;
        // An upload's channel often isn't the artist, so an exact title at the
        // exact length is trusted on its own.
        if (!sameArtist && !(sameTitle && delta !== undefined && delta <= 2)) continue;
        let s = 20 - rank + (sameTitle ? 6 : 0) + (sameArtist ? 6 : 0);
        if (delta !== undefined) s += delta <= 3 ? 4 : delta <= 10 ? 1 : -3;
        if (s > bestScore) {
            best = r;
            bestScore = s;
        }
    }
    return best;
}

/** The iTunes song for a playlist track, or null when the catalog doesn't have it. */
export async function findTrack(track: PlaylistTrack, search: SongSearch): Promise<Song | null> {
    const title = normalizeTitle(track.title);
    if (!title) return null;
    const artist = splitArtists(track.artist)[0] ?? '';
    const found = pick(await search(`${artist} ${title}`), track);
    if (found || !artist) return found && toSong(found);
    // The artist name can be what trips the search up (a channel name, another spelling).
    const loose = pick(await search(title), track);
    return loose && toSong(loose);
}
