// Song-title and artist normalization, shared by the game (judging guesses) and
// the data build script (matching curated seeds to iTunes results). It has no
// imports so Node can run it directly with type stripping.

export type Verdict = 'correct' | 'close' | 'wrong';

interface Named {
    id?: number;
    title: string;
    artist: string;
}

// Words that only describe a particular recording, not the song itself.
const QUALIFIER =
    /\b(remaster(ed)?|live|version|edit|mix|mono|stereo|from|feat|ft|featuring|acoustic|demo|single|deluxe|anniversary|bonus|instrumental|original|recorded|session|take|explicit|clean|soundtrack|theme|reprise|extended|radio|unplugged|remix|sped|slowed)\b/;

// Lowercase, strip Latin diacritics, unify quotes. Marks in other scripts
// (Devanagari matras, etc.) are kept so those titles stay distinct.
function fold(raw: string): string {
    return raw
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[\u2018\u2019\u201b`\u00b4]/g, "'")
        .replace(/[\u201c\u201d\u201e]/g, '"');
}

// Collapse punctuation to single spaces. Apostrophes vanish so "don't" == "dont".
function clean(s: string): string {
    return s
        .replace(/&/g, ' and ')
        .replace(/'/g, '')
        .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
        .trim();
}

/** Loose form of any text for search-as-you-type matching. */
export function simplify(raw: string): string {
    return clean(fold(raw));
}

export function normalizeTitle(raw: string): string {
    let s = fold(raw);

    // Drop bracketed segments: "(feat. X)", "[Remastered 2011]", "(From "Movie")".
    // Both sides of a comparison are stripped the same way, so titles whose
    // brackets are part of the name ("Sweet Dreams (Are Made of This)") still match.
    const unbracketed = s.replace(/\s*[([{][^)\]}]*[)\]}]/g, ' ').trim();
    if (unbracketed) s = unbracketed;

    // Drop dash suffixes that only qualify the recording: "Song - 2011 Remaster".
    s = s.replace(/\s+[-\u2013\u2014]\s+(.*)$/, (whole, tail: string) =>
        QUALIFIER.test(tail) || /^\d{4}\b/.test(tail) ? '' : whole,
    );

    // Drop an unbracketed trailing "feat. X".
    s = s.replace(/\s+(feat\.?|ft\.?|featuring)\s.*$/, '');

    return clean(s);
}

export function splitArtists(raw: string): string[] {
    return fold(raw)
        .split(/\s*(?:,|&|\+|\/|;|\bx\b|\band\b|\bfeat\.?|\bft\.?|\bfeaturing\b|\bwith\b|\bvs\.?)\s*/)
        .map((a) => clean(a).replace(/^the /, ''))
        .filter(Boolean);
}

export function artistsOverlap(a: string, b: string): boolean {
    const other = new Set(splitArtists(b));
    return splitArtists(a).some((name) => other.has(name));
}

// Identity used to de-duplicate the same song released on several albums.
export function songKey(song: Named): string {
    return `${normalizeTitle(song.title)}|${splitArtists(song.artist)[0] ?? ''}`;
}

// A guess is correct when it is the same recording, or the same song title by
// an overlapping artist (so remasters, live cuts and features all count). It is
// "close" when only the artist or only the title lines up.
export function judgeGuess(guess: Named, answer: Named): Verdict {
    if (guess.id !== undefined && guess.id === answer.id) return 'correct';
    const sameTitle = normalizeTitle(guess.title) === normalizeTitle(answer.title);
    const sameArtist = artistsOverlap(guess.artist, answer.artist);
    if (sameTitle && sameArtist) return 'correct';
    if (sameTitle || sameArtist) return 'close';
    return 'wrong';
}
