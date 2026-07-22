// Parses pasted playlist/track links per provider. Shared by solo Setup.jsx
// and multiplayer CreateLobby.jsx so both build the same lineup the same
// way. iTunes has no playlist/URL concept — it isn't included here (its UX
// is search-and-add instead, see Setup.jsx / CreateLobby.jsx).

export const extractSpotifyId = (url) => {
    const trimmed = url.trim();
    if (trimmed.includes('spotify.com') || trimmed.includes('spotify.link')) {
        const playlistMatch = trimmed.match(/\/playlist\/([a-zA-Z0-9]{22})/);
        if (playlistMatch) return { type: 'playlist', id: playlistMatch[1] };

        const trackMatch = trimmed.match(/\/track\/([a-zA-Z0-9]{22})/);
        if (trackMatch) return { type: 'track', id: trackMatch[1] };
    }
    if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return { type: 'track', id: trimmed };
    return null;
};

export const extractAppleId = (url) => {
    if (!url.includes('music.apple.com')) return null;
    const storefrontMatch = url.match(/music\.apple\.com\/(\w{2})\//);
    const storefront = storefrontMatch ? storefrontMatch[1] : 'us';

    const playlistMatch = url.match(/\/playlist\/[^/]+\/(pl\.[a-zA-Z0-9-]+)/);
    if (playlistMatch) return { type: 'playlist', id: playlistMatch[1], storefront };

    // Song-within-an-album links carry the real song id in `?i=`; the path
    // id in that case is the album's id, not the song's.
    const iParam = url.match(/[?&]i=(\d+)/);
    if (iParam) return { type: 'track', id: iParam[1], storefront };

    const songMatch = url.match(/\/(?:song|album)\/[^/]+\/(\d+)/);
    if (songMatch) return { type: 'track', id: songMatch[1], storefront };

    return null;
};

export const extractDeezerId = (url) => {
    if (!url.includes('deezer.com')) return null;
    const playlistMatch = url.match(/\/playlist\/(\d+)/);
    if (playlistMatch) return { type: 'playlist', id: playlistMatch[1] };

    const trackMatch = url.match(/\/track\/(\d+)/);
    if (trackMatch) return { type: 'track', id: trackMatch[1] };

    return null;
};

export const EXTRACTORS = { spotify: extractSpotifyId, apple: extractAppleId, deezer: extractDeezerId };

// Splits pasted textarea content into individual, parsed link entries plus
// any lines that failed to parse.
export const parseLines = (input, provider) => {
    const extractId = EXTRACTORS[provider];
    const lines = input.split('\n').map((l) => l.trim()).filter(Boolean);
    const entries = lines.map((line) => ({ line, parsed: extractId(line) }));
    const failed = entries.filter((e) => !e.parsed).map((e) => e.line);
    const playlists = entries.filter((e) => e.parsed?.type === 'playlist').map((e) => e.parsed);
    const tracks = entries.filter((e) => e.parsed?.type === 'track').map((e) => e.parsed);
    return { playlists, tracks, failed };
};
