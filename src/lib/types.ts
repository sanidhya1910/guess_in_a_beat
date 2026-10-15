export interface Song {
    /** iTunes track id. */
    id: number;
    title: string;
    artist: string;
    album: string;
    /** 100x100 artwork URL; use `artworkAt()` for other sizes. */
    artwork: string;
    /** 30-second preview clip. */
    preview: string;
    year?: number;
    genre?: string;
    /** Apple Music link for the track. */
    url?: string;
    /** Length of the full track in seconds. */
    duration?: number;
}

export type PackCategory = 'charts' | 'decades' | 'genres';

export interface PackInfo {
    id: string;
    title: string;
    blurb: string;
    category: PackCategory;
    /** iTunes storefront the songs were resolved in. */
    country: string;
    count: number;
    covers: string[];
    /** ISO date the pack was last refreshed (charts only). */
    updated?: string;
}

export interface ArtistPick {
    id: number;
    name: string;
    artwork: string;
    genre?: string;
    country: string;
}

export interface DailyCategory {
    id: string;
    title: string;
    blurb: string;
    /** The rotation: day N plays songs[N % songs.length]. */
    songs: Song[];
}

export interface DailyData {
    /** Local calendar date of puzzle #1, as YYYY-MM-DD. */
    epoch: string;
    categories: DailyCategory[];
}

export type Difficulty = 'easy' | 'normal' | 'hard';
