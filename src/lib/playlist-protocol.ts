// Types and link parsing for importing a Spotify or YouTube playlist into a
// custom challenge, shared by the browser and the Worker (worker/playlists.ts,
// worker/catalog.ts). No DOM or Worker APIs here.

import type { Song } from './types';

export type PlaylistSource = 'spotify' | 'youtube';

export interface PlaylistTrack {
    title: string;
    artist: string;
    /** Length in seconds, used to pick the right release. */
    duration?: number;
}

export interface Playlist {
    source: PlaylistSource;
    title: string;
    tracks: PlaylistTrack[];
}

export type PlaylistRef = { source: 'spotify'; kind: 'playlist' | 'album'; id: string } | { source: 'youtube'; id: string };

/** The result of finding a playlist track in the iTunes catalog. `busy` means
 *  iTunes rate-limited the lookup, so it is worth trying again later. */
export type MatchResult = { status: 'found'; song: Song } | { status: 'missing' } | { status: 'busy' };

/** Tracks read from one playlist. Spotify's embed stops at 100 by itself. */
export const MAX_PLAYLIST_TRACKS = 300;
/** Tracks matched per request, which keeps a request inside the Worker's subrequest limit. */
export const MATCH_BATCH = 8;

/** Accepts playlist and album links from Spotify, YouTube and YouTube Music,
 *  with or without the scheme, and `spotify:playlist:<id>` URIs. */
export function parsePlaylistUrl(raw: string): PlaylistRef | null {
    const text = raw.trim();
    const uri = text.match(/^spotify:(playlist|album):([A-Za-z0-9]{22})$/);
    if (uri) return { source: 'spotify', kind: uri[1] as 'playlist' | 'album', id: uri[2] };

    let url: URL;
    try {
        url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    } catch {
        return null;
    }
    const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');
    if (host === 'open.spotify.com' || host === 'play.spotify.com') {
        // Also matches localized paths such as /intl-de/playlist/<id>.
        const m = url.pathname.match(/\/(playlist|album)\/([A-Za-z0-9]{22})\b/);
        return m ? { source: 'spotify', kind: m[1] as 'playlist' | 'album', id: m[2] } : null;
    }
    if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtu.be') {
        const list = url.searchParams.get('list');
        return list && /^[\w-]{10,64}$/.test(list) ? { source: 'youtube', id: list } : null;
    }
    return null;
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Validates the body of a match request: `{ country, tracks }`. Results are
 *  returned in the order of `tracks`, so one bad track rejects the request. */
export function parseMatchRequest(body: unknown): { country: string; tracks: PlaylistTrack[] } | null {
    const b = body as { country?: unknown; tracks?: unknown } | null;
    if (!b || !Array.isArray(b.tracks)) return null;
    const country = typeof b.country === 'string' && /^[a-z]{2}$/.test(b.country) ? b.country : 'us';
    const tracks: PlaylistTrack[] = [];
    for (const raw of b.tracks.slice(0, MATCH_BATCH)) {
        const t = raw as { title?: unknown; artist?: unknown; duration?: unknown } | null;
        const title = text(t?.title, 300);
        const artist = text(t?.artist, 300);
        const duration = typeof t?.duration === 'number' && t.duration > 0 && t.duration < 7200 ? Math.round(t.duration) : undefined;
        if (!title) return null;
        tracks.push({ title, artist, duration });
    }
    return tracks.length ? { country, tracks } : null;
}
