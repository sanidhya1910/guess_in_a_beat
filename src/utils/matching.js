// Fuzzy guess-matching logic shared between solo play (Game.jsx, client-only)
// and multiplayer lobbies (server/lobby.js, authoritative — never trust a
// client's own claim of correctness). Plain JS, no browser/Node-only APIs.

export const normalizeName = (name) =>
    (name || '')
        .toLowerCase()
        .replace(/\s*[-–—]\s*(remaster(ed)?|deluxe|special|edition|version|live|acoustic|remix|radio edit|single|mix|mono|stereo|anniversary|extended|bonus|explicit|clean).*$/i, '')
        .replace(/\s*\((remaster(ed)?|deluxe|special|edition|version|live|acoustic|remix|radio edit|single|mix|mono|stereo|anniversary|extended|bonus|explicit|clean|feat\.?.*|ft\.?.*|\d{4})\)/gi, '')
        .replace(/\s*\[(remaster(ed)?|deluxe|special|edition|version|live|acoustic|remix|radio edit|single|mix|mono|stereo|anniversary|extended|bonus|explicit|clean|feat\.?.*|ft\.?.*|\d{4})\]/gi, '')
        .replace(/[''`]/g, "'")
        .replace(/[""]/g, '"')
        .trim();

export const isCorrectGuess = (guessedTrack, targetTrack) => {
    if (guessedTrack.id === targetTrack.id) return true;
    const gName = normalizeName(guessedTrack.name);
    const cName = normalizeName(targetTrack.name);
    const gArtists = guessedTrack.artists.map((a) => a.name.toLowerCase().trim());
    const cArtists = targetTrack.artists.map((a) => a.name.toLowerCase().trim());
    if (gName === cName && gArtists.some((a) => cArtists.includes(a))) return true;
    return false;
};
