import axios from 'axios';
import { parseLines } from '../src/utils/parsePlaylistInput.js';

// Server-side track resolution for multiplayer lobbies. The host's browser
// still does the pasted-link parsing UI, but the ACTUAL fetch + normalization
// happens here, server-side, so every player in the lobby gets the identical,
// authoritative track list without relaying any provider tokens between
// clients. URL parsing is shared with Setup.jsx/CreateLobby.jsx via
// parsePlaylistInput.js so the two never drift; the normalization below is
// server-only since it hits absolute API URLs directly (no CORS proxy needed
// server-to-server), unlike the client-side src/services/*.js equivalents.

const normalizeSpotify = (t) => ({
    id: t.id,
    name: t.name,
    artists: t.artists.map((a) => ({ name: a.name })),
    album: { images: t.album?.images || [] },
    preview_url: t.preview_url || null,
    uri: t.uri,
});

async function resolveSpotify(sourceInput, token) {
    const headers = { Authorization: `Bearer ${token}` };
    const { playlists, tracks: trackEntries } = parseLines(sourceInput, 'spotify');
    const playlistIds = playlists.map((e) => e.id);
    const trackIds = trackEntries.map((e) => e.id);

    let tracks = [];
    for (const playlistId of playlistIds) {
        let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
        while (url) {
            const { data } = await axios.get(url, { headers });
            tracks.push(...data.items.map((i) => i.track).filter((t) => t?.uri));
            url = data.next;
        }
    }
    for (let i = 0; i < trackIds.length; i += 50) {
        const chunk = trackIds.slice(i, i + 50);
        const { data } = await axios.get('https://api.spotify.com/v1/tracks', {
            headers,
            params: { ids: chunk.join(',') },
        });
        tracks.push(...(data.tracks || []).filter(Boolean));
    }
    return tracks.map(normalizeSpotify);
}

const normalizeApple = (song) => {
    const attrs = song.attributes || {};
    const artworkTemplate = attrs.artwork?.url;
    const artworkAt = (size) => (artworkTemplate ? artworkTemplate.replace('{w}', size).replace('{h}', size) : null);
    const images = artworkTemplate
        ? [{ url: artworkAt(600) }, { url: artworkAt(300) }, { url: artworkAt(64) }]
        : [];
    return {
        id: song.id,
        name: attrs.name,
        artists: [{ name: attrs.artistName }],
        album: { images },
        preview_url: attrs.previews?.[0]?.url || null,
        uri: `apple:song:${song.id}`,
    };
};

async function resolveApple(sourceInput, getDeveloperToken) {
    const token = getDeveloperToken();
    const headers = { Authorization: `Bearer ${token}` };
    const { playlists, tracks: trackEntries } = parseLines(sourceInput, 'apple');

    let tracks = [];
    for (const entry of playlists) {
        const { data } = await axios.get(
            `https://api.music.apple.com/v1/catalog/${entry.storefront}/playlists/${entry.id}`,
            { headers, params: { include: 'tracks' } }
        );
        const songs = (data.data?.[0]?.relationships?.tracks?.data || []).filter((t) => t.type === 'songs');
        tracks.push(...songs);
    }

    for (let i = 0; i < trackEntries.length; i += 50) {
        const chunk = trackEntries.slice(i, i + 50);
        const storefront = chunk[0].storefront;
        const { data } = await axios.get(`https://api.music.apple.com/v1/catalog/${storefront}/songs`, {
            headers,
            params: { ids: chunk.map((e) => e.id).join(',') },
        });
        tracks.push(...(data.data || []));
    }
    return tracks.map(normalizeApple);
}

const normalizeDeezer = (t) => ({
    id: String(t.id),
    name: t.title,
    artists: [{ name: t.artist?.name }],
    album: {
        images: [{ url: t.album?.cover_big }, { url: t.album?.cover_medium }, { url: t.album?.cover_small }],
    },
    preview_url: t.preview || null,
    uri: `deezer:track:${t.id}`,
});

async function resolveDeezer(sourceInput) {
    const { playlists, tracks: trackEntries } = parseLines(sourceInput, 'deezer');

    let tracks = [];
    for (const entry of playlists) {
        let url = `https://api.deezer.com/playlist/${entry.id}/tracks?limit=100`;
        while (url) {
            const { data } = await axios.get(url);
            tracks.push(...(data.data || []));
            url = data.next || null;
        }
    }

    const trackResults = await Promise.all(
        trackEntries.map(async (e) => {
            try {
                const { data } = await axios.get(`https://api.deezer.com/track/${e.id}`);
                return data.error ? null : data;
            } catch {
                return null;
            }
        })
    );
    tracks.push(...trackResults.filter(Boolean));
    return tracks.filter((t) => t.type === 'track' || t.id).map(normalizeDeezer);
}

const normalizeItunes = (t) => ({
    id: String(t.trackId),
    name: t.trackName,
    artists: [{ name: t.artistName }],
    album: {
        images: t.artworkUrl100
            ? [
                  { url: t.artworkUrl100.replace('100x100bb', '600x600bb') },
                  { url: t.artworkUrl100.replace('100x100bb', '300x300bb') },
                  { url: t.artworkUrl100 },
              ]
            : [],
    },
    preview_url: t.previewUrl || null,
    uri: `itunes:track:${t.trackId}`,
});

// iTunes has no playlist concept — the host picks songs via search-and-add
// client-side, then submits the chosen ids; we re-fetch them here from
// iTunes's own lookup API so the server (not the client) is still the
// authoritative source of the final track data.
async function resolveItunes(trackIds) {
    const results = [];
    for (let i = 0; i < trackIds.length; i += 50) {
        const chunk = trackIds.slice(i, i + 50);
        const { data } = await axios.get('https://itunes.apple.com/lookup', { params: { id: chunk.join(',') } });
        results.push(...(data.results || []).filter((t) => t.trackId));
    }
    return results.map(normalizeItunes);
}

export async function resolveTracks({ provider, sourceInput, trackIds, spotifyToken, getAppleDeveloperToken }) {
    let tracks;
    if (provider === 'spotify') tracks = await resolveSpotify(sourceInput, spotifyToken);
    else if (provider === 'apple') tracks = await resolveApple(sourceInput, getAppleDeveloperToken);
    else if (provider === 'deezer') tracks = await resolveDeezer(sourceInput);
    else if (provider === 'itunes') tracks = await resolveItunes(trackIds || []);
    else throw new Error(`Unknown provider: ${provider}`);

    return tracks.filter((t, i, arr) => i === arr.findIndex((x) => x.id === t.id));
}
