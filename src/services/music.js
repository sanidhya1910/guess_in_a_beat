import axios from 'axios';

// iTunes Search API preview lookup, used as a playback fallback when a Spotify
// track has no preview_url. The iTunes API sends no CORS header, so requests go
// through a same-origin proxy (Vite dev proxy / Express) that forwards
// `/api/itunes/*` to `https://itunes.apple.com/*`. No key or login required.
const ITUNES = '/api/itunes';

const norm = (s) => (s || '').toLowerCase().trim();

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
