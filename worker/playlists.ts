// Reads the tracks of a public Spotify or YouTube playlist (or album) so they
// can be picked for a custom challenge. Neither service needs a key here:
//
//   Spotify  the embed player's page carries the first 100 tracks
//   YouTube  YouTube Music's web API lists a playlist 100 tracks at a time,
//            with proper title and artist fields for anything it knows as music
//
// Shared by the Worker and the Vite dev server.

import { artistsOverlap } from '../src/lib/match';
import { MAX_PLAYLIST_TRACKS, type Playlist, type PlaylistRef, type PlaylistTrack } from '../src/lib/playlist-protocol';
import { musicApi, musicItems, type MusicItem } from './youtube';

/** A problem the person importing can fix; the message is shown to them. */
export class PlaylistError extends Error {}

const NOT_FOUND = "Couldn't find that playlist. Make sure it's public, then copy the link again.";

export function readPlaylist(ref: PlaylistRef): Promise<Playlist> {
    return ref.source === 'spotify' ? readSpotify(ref.kind, ref.id) : readYouTube(ref.id);
}

// ── Spotify ─────────────────────────────────────────────────────────────────

interface SpotifyEntity {
    name?: string;
    title?: string;
    trackList?: { title?: string; subtitle?: string; duration?: number; entityType?: string }[];
}

async function readSpotify(kind: 'playlist' | 'album', id: string): Promise<Playlist> {
    const res = await fetch(`https://open.spotify.com/embed/${kind}/${id}`, {
        headers: {
            'accept-language': 'en',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        },
    });
    if (res.status === 404 || res.status === 400) throw new PlaylistError(NOT_FOUND);
    if (!res.ok) throw new Error(`Spotify responded ${res.status}`);
    const json = (await res.text()).match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)?.[1];
    if (!json) throw new Error('Spotify embed page had no data');
    const entity = (JSON.parse(json) as { props?: { pageProps?: { state?: { data?: { entity?: SpotifyEntity } } } } }).props
        ?.pageProps?.state?.data?.entity;
    if (!entity?.trackList) throw new PlaylistError(NOT_FOUND);
    const tracks: PlaylistTrack[] = [];
    for (const t of entity.trackList) {
        // Podcast episodes can sit in playlists too.
        if (t.entityType && t.entityType !== 'track') continue;
        if (!t.title || !t.subtitle) continue;
        tracks.push({ title: t.title, artist: t.subtitle, duration: t.duration ? Math.round(t.duration / 1000) : undefined });
    }
    return { source: 'spotify', title: entity.name || entity.title || 'Spotify playlist', tracks };
}

// ── YouTube ─────────────────────────────────────────────────────────────────

// Words that describe an upload rather than the song.
const UPLOAD_NOISE =
    /\b(official|video|audio|lyrics?|lyrical|karaoke|visuali[sz]er|hd|hq|4k|mv|m\/v|full song|clip|explicit|performance)\b/i;
// The same, unbracketed at the end of a title: "Jatti Full Video Song", "Song Karaoke With Lyrics".
const TRAILING_NOISE = /\s+((full|official|new|latest)?\s*(music\s+)?(video|audio|lyrical)(\s+song)?|karaoke\b.*|with lyrics\b.*)$/i;

/** A video title without the parts that describe the upload:
 *  "Song (Official Video) | Film | Cast" becomes "Song". */
function stripNoise(title: string): string {
    return (
        title
            .split(/\s+[|•]\s+/)[0]
            .replace(/\s*[([【]([^)\]】]*)[)\]】]/g, (whole, inner: string) => (UPLOAD_NOISE.test(inner) ? '' : whole))
            // Long titles arrive cut short: "Song (Performance Vid..."
            .replace(/\s*[([][^)\]]*(\.\.\.|…)$/, '')
            .replace(TRAILING_NOISE, '')
            .trim()
    );
}

/** Song title and artist from a user upload's free-form title and its channel. */
function tidyUpload(rawTitle: string, channel: string): { title: string; artist: string } {
    const uploader = channel.replace(/\s*-\s*topic$/i, '').replace(/\s*vevo$/i, '').trim();
    const title = stripNoise(rawTitle);
    const dash = title.match(/^(.+?)\s*[-–—:]\s+(.+)$/) ?? title.match(/^(.+?)\s+[-–—]\s*(.+)$/);
    if (!dash) return { title, artist: uploader };
    const [, left, right] = dash;
    // "Song - Karaoke With Lyrics" or "Lyrics - Song": the noisy side isn't the song.
    if (UPLOAD_NOISE.test(right) !== UPLOAD_NOISE.test(left)) {
        return { title: stripNoise(UPLOAD_NOISE.test(right) ? left : right), artist: uploader };
    }
    if (artistsOverlap(right, uploader) && !artistsOverlap(left, uploader)) return { title: left, artist: uploader }; // "Song - Artist"
    return { title: right, artist: left }; // "Artist - Song", the usual order
}

function toTrack(item: MusicItem): PlaylistTrack | null {
    if (item.type === 'MUSIC_VIDEO_TYPE_PODCAST_EPISODE') return null;
    // Art tracks and official videos come with real title and artist fields;
    // anything else only has the uploader's free-form title.
    const { title, artist } =
        item.type === 'MUSIC_VIDEO_TYPE_ATV'
            ? { title: item.title, artist: item.artist }
            : item.type === 'MUSIC_VIDEO_TYPE_OMV'
              ? { title: stripNoise(item.title), artist: item.artist }
              : tidyUpload(item.title, item.artist);
    return title && artist ? { title, artist, duration: item.seconds || undefined } : null;
}

function headerTitle(data: unknown): string {
    let found = '';
    const walk = (node: unknown) => {
        if (found || !node || typeof node !== 'object') return;
        for (const [key, value] of Object.entries(node)) {
            const runs = (value as { title?: { runs?: { text: string }[] } } | null)?.title?.runs;
            if (key.endsWith('HeaderRenderer') && runs) {
                found = runs.map((r) => r.text).join('');
                return;
            }
            walk(value);
        }
    };
    walk(data);
    return found;
}

/** The token for the next page of the track list, if there is one. */
function continuation(data: unknown): string | undefined {
    return JSON.stringify(data).match(/"continuationItemRenderer":\{.*?"continuationCommand":\{"token":"([^"]+)"/)?.[1];
}

async function readYouTube(list: string): Promise<Playlist> {
    let data = await musicApi('browse', { browseId: `VL${list}` });
    const title = headerTitle(data);
    const tracks: PlaylistTrack[] = [];
    for (let page = 0; ; page++) {
        for (const item of musicItems(data)) {
            const track = toTrack(item);
            if (track) tracks.push(track);
        }
        const token = continuation(data);
        if (!token || tracks.length >= MAX_PLAYLIST_TRACKS || page >= 5) break;
        data = await musicApi('browse', { continuation: token });
    }
    // Private and deleted playlists come back as an empty page rather than an error.
    if (!tracks.length && !title) throw new PlaylistError(NOT_FOUND);
    return { source: 'youtube', title: title || 'YouTube playlist', tracks: tracks.slice(0, MAX_PLAYLIST_TRACKS) };
}
