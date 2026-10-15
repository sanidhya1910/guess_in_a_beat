import { describe, expect, it } from 'vitest';
import { MATCH_BATCH, parseMatchRequest, parsePlaylistUrl } from './playlist-protocol';

const SPOTIFY_ID = '37i9dQZF1DXcBWIGoYBM5M';
const YT_LIST = 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI';

describe('parsePlaylistUrl', () => {
    it('reads Spotify playlist and album links', () => {
        expect(parsePlaylistUrl(`https://open.spotify.com/playlist/${SPOTIFY_ID}?si=abc123`)).toEqual({
            source: 'spotify',
            kind: 'playlist',
            id: SPOTIFY_ID,
        });
        expect(parsePlaylistUrl(`open.spotify.com/intl-de/album/${SPOTIFY_ID}`)).toEqual({ source: 'spotify', kind: 'album', id: SPOTIFY_ID });
        expect(parsePlaylistUrl(`  spotify:playlist:${SPOTIFY_ID} `)).toEqual({ source: 'spotify', kind: 'playlist', id: SPOTIFY_ID });
    });

    it('reads YouTube and YouTube Music playlist links', () => {
        const ref = { source: 'youtube', id: YT_LIST };
        expect(parsePlaylistUrl(`https://www.youtube.com/playlist?list=${YT_LIST}`)).toEqual(ref);
        expect(parsePlaylistUrl(`https://music.youtube.com/playlist?list=${YT_LIST}&si=x`)).toEqual(ref);
        expect(parsePlaylistUrl(`https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=${YT_LIST}&index=3`)).toEqual(ref);
        expect(parsePlaylistUrl(`youtu.be/dQw4w9WgXcQ?list=${YT_LIST}`)).toEqual(ref);
    });

    it('rejects links that are not playlists', () => {
        expect(parsePlaylistUrl('https://open.spotify.com/track/11hcBLPtbMp4aQI6zGQLub')).toBeNull();
        expect(parsePlaylistUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
        expect(parsePlaylistUrl(`https://example.com/playlist?list=${YT_LIST}`)).toBeNull();
        expect(parsePlaylistUrl('not a link')).toBeNull();
        expect(parsePlaylistUrl('')).toBeNull();
    });
});

describe('parseMatchRequest', () => {
    it('keeps valid tracks and a valid country', () => {
        expect(parseMatchRequest({ country: 'in', tracks: [{ title: ' Kesariya ', artist: 'Arijit Singh', duration: 268.4 }] })).toEqual({
            country: 'in',
            tracks: [{ title: 'Kesariya', artist: 'Arijit Singh', duration: 268 }],
        });
    });

    it('falls back to the US store and drops a nonsense duration', () => {
        expect(parseMatchRequest({ country: 'USA', tracks: [{ title: 'Hey Jude', artist: 'The Beatles', duration: -4 }] })).toEqual({
            country: 'us',
            tracks: [{ title: 'Hey Jude', artist: 'The Beatles', duration: undefined }],
        });
    });

    it('caps the batch size', () => {
        const tracks = Array.from({ length: MATCH_BATCH + 5 }, (_, i) => ({ title: `Song ${i}`, artist: 'A' }));
        expect(parseMatchRequest({ tracks })?.tracks).toHaveLength(MATCH_BATCH);
    });

    it('rejects a request with a bad track, since results line up with tracks', () => {
        expect(parseMatchRequest({ tracks: [{ title: 'Ok', artist: 'A' }, { artist: 'No title' }] })).toBeNull();
        expect(parseMatchRequest({ tracks: [] })).toBeNull();
        expect(parseMatchRequest(null)).toBeNull();
    });
});
