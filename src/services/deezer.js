import axios from 'axios';

// Deezer's public catalog API needs no login/key, but sends no CORS header,
// so requests go through a same-origin proxy (Vite dev proxy / Express) that
// forwards `/api/deezer/*` to `https://api.deezer.com/*`.
const DEEZER = '/api/deezer';

const normalizeTrack = (track) => ({
    id: String(track.id),
    name: track.title,
    artists: [{ name: track.artist?.name }],
    album: {
        images: [
            { url: track.album?.cover_big },
            { url: track.album?.cover_medium },
            { url: track.album?.cover_small },
        ],
    },
    preview_url: track.preview || null,
    uri: `deezer:track:${track.id}`,
});

export const getPlaylistTracks = async (playlistId) => {
    const tracks = [];
    let next = `${DEEZER}/playlist/${playlistId}/tracks?limit=100`;

    while (next) {
        const { data } = await axios.get(next);
        tracks.push(...(data.data || []));
        // Deezer's `next` is a fully-qualified api.deezer.com URL; route it
        // back through our same-origin proxy instead of following it directly.
        next = data.next ? DEEZER + new URL(data.next).pathname + new URL(data.next).search : null;
    }

    return tracks.filter((t) => t.type === 'track').map(normalizeTrack);
};

export const getAlbumTracks = async (albumId) => {
    const tracks = [];
    let next = `${DEEZER}/album/${albumId}/tracks?limit=100`;
    while (next) {
        const { data } = await axios.get(next);
        tracks.push(...(data.data || []));
        next = data.next ? DEEZER + new URL(data.next).pathname + new URL(data.next).search : null;
    }
    // Album-track objects omit the album cover; fetch the album once for artwork.
    let images = [];
    try {
        const { data: album } = await axios.get(`${DEEZER}/album/${albumId}`);
        images = [{ url: album.cover_big }, { url: album.cover_medium }, { url: album.cover_small }];
    } catch {
        // artwork is optional — proceed without it
    }
    return tracks
        .filter((t) => t.type === 'track')
        .map((t) => ({ ...normalizeTrack(t), album: { images } }));
};

export const getSeveralTracks = async (ids) => {
    const results = await Promise.all(
        ids.map(async (id) => {
            try {
                const { data } = await axios.get(`${DEEZER}/track/${id}`);
                return data.error ? null : data;
            } catch {
                return null;
            }
        })
    );
    return results.filter(Boolean).map(normalizeTrack);
};

export const searchTracks = async (query) => {
    const { data } = await axios.get(`${DEEZER}/search`, { params: { q: query, limit: 10 } });
    return (data.data || []).map(normalizeTrack);
};
