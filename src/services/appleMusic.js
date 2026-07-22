import axios from 'axios';

// Apple Music catalog client. Unlike Spotify, catalog reads (search, public
// playlists, public songs) only need an app-wide developer token — no user
// login, no MusicKit JS SDK. The token is minted server-side (see
// vite.config.ts / server/index.js) and cached here.
const CATALOG = 'https://api.music.apple.com/v1/catalog';

let cachedToken = null;

const getDeveloperToken = async () => {
    if (cachedToken) return cachedToken;
    const { data } = await axios.get('/auth/apple/developer-token');
    cachedToken = data.developer_token;
    return cachedToken;
};

const catalogRequest = async (path, params, storefront) => {
    const request = async (token) =>
        axios.get(`${CATALOG}/${storefront}${path}`, {
            params,
            headers: { Authorization: `Bearer ${token}` },
        });

    try {
        const token = await getDeveloperToken();
        return await request(token);
    } catch (err) {
        if (err.response?.status === 401) {
            cachedToken = null;
            const token = await getDeveloperToken();
            return request(token);
        }
        throw err;
    }
};

const normalizeTrack = (song) => {
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

export const getPlaylistTracks = async (storefront, playlistId) => {
    const { data } = await catalogRequest(`/playlists/${playlistId}`, { include: 'tracks' }, storefront);
    const tracks = data.data?.[0]?.relationships?.tracks?.data || [];
    return tracks.filter((t) => t.type === 'songs').map(normalizeTrack);
};

export const getAlbumTracks = async (storefront, albumId) => {
    const { data } = await catalogRequest(`/albums/${albumId}`, { include: 'tracks' }, storefront);
    const tracks = data.data?.[0]?.relationships?.tracks?.data || [];
    return tracks.filter((t) => t.type === 'songs').map(normalizeTrack);
};

export const getSeveralTracks = async (storefront, ids) => {
    const chunks = [];
    for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));

    const results = [];
    for (const chunk of chunks) {
        const { data } = await catalogRequest('/songs', { ids: chunk.join(',') }, storefront);
        results.push(...(data.data || []).map(normalizeTrack));
    }
    return results;
};

export const searchTracks = async (storefront, query) => {
    const { data } = await catalogRequest('/search', { term: query, types: 'songs', limit: 10 }, storefront);
    return (data.results?.songs?.data || []).map(normalizeTrack);
};
