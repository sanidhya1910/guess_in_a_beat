import type { Song } from './types';

/** Where to hear the full song after a reveal. */
export function listenLinks(song: Song) {
    const q = encodeURIComponent(`${song.title} ${song.artist}`);
    return {
        apple: song.url || (song.id > 0 ? `https://music.apple.com/us/song/${song.id}` : `https://music.apple.com/search?term=${q}`),
        spotify: `https://open.spotify.com/search/${q}`,
        youtube: `https://www.youtube.com/results?search_query=${q}`,
    };
}
