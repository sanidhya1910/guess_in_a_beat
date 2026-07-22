import axios from 'axios';

// iTunes Search API client. Used both as a playback fallback when another
// provider's track has no preview_url, and as its own standalone free
// provider (search-and-add, no login required — see normalizeTrack below).
// The iTunes API sends no CORS header, so requests go through a same-origin
// proxy (Vite dev proxy / Express) that forwards `/api/itunes/*` to
// `https://itunes.apple.com/*`.
const ITUNES = '/api/itunes';

const norm = (s) => (s || '').toLowerCase().trim();

const normalizeTrack = (t) => ({
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

// iTunes has no playlist concept — Setup.jsx's UX for this provider is
// search-and-add rather than paste-a-URL.
export const searchTracks = async (query) => {
    const { data } = await axios.get(`${ITUNES}/search`, {
        params: { term: query, entity: 'song', limit: 10 },
    });
    return (data.results || []).filter((t) => t.trackId).map(normalizeTrack);
};

export const getSeveralTracks = async (ids) => {
    const results = [];
    for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        const { data } = await axios.get(`${ITUNES}/lookup`, { params: { id: chunk.join(',') } });
        results.push(...(data.results || []).filter((t) => t.trackId));
    }
    return results.map(normalizeTrack);
};

// Find a 30-second preview URL for a track by title + artist. Returns null if
// nothing suitable is found.
export const findPreviewUrl = async (name, artist) => {
    try {
        const { data } = await axios.get(`${ITUNES}/search`, {
            params: { term: `${name} ${artist}`.trim(), entity: 'song', limit: 5 },
        });
        const results = (data.results || []).filter((r) => r.previewUrl);
        if (!results.length) return null;

        // Prefer a result whose artist matches the requested one.
        const wanted = norm(artist).split(',')[0].trim();
        const match =
            results.find((r) => norm(r.artistName).includes(wanted) || wanted.includes(norm(r.artistName))) ||
            results[0];
        return match.previewUrl || null;
    } catch (e) {
        console.error('iTunes preview lookup failed:', e.message);
        return null;
    }
};
