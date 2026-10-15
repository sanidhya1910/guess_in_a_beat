// Messages and shared rules for multiplayer rooms, used by both the browser and
// the room Durable Object (worker/room.ts). No DOM or Worker APIs here.

import type { Difficulty, Song } from './types';

/** A YouTube video and where the music in it starts, in seconds. */
export interface Video {
    id: string;
    start: number;
}

export const ROOM_CODE_LENGTH = 4;
/** No 0/O or 1/I, so codes survive being read out loud. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAX_PLAYERS = 12;
export const MAX_NAME = 20;
export const ROUND_CHOICES = [5, 10, 15, 20];

/** Time to guess after each clip finishes playing. */
export const GUESS_WINDOW_MS = 7_000;
/** "Get ready" pause before the first clip of each song, so every player has it loaded. */
export const COUNTDOWN_MS = 3_500;
/** How long the answer stays up before the next song. */
export const REVEAL_MS = 10_000;
/** Extra points for the first, second and third player to name the song. */
export const SPEED_BONUS = [30, 20, 10];

export const REACTIONS = ['🔥', '😂', '😮', '👏', '😭', '🎵'] as const;
export type Reaction = (typeof REACTIONS)[number];

export function normalizeCode(raw: string): string {
    return raw
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, ROOM_CODE_LENGTH);
}

export function isRoomCode(code: string): boolean {
    return code.length === ROOM_CODE_LENGTH && [...code].every((c) => ROOM_CODE_ALPHABET.includes(c));
}

export function cleanName(raw: string): string {
    return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

export interface RoomSource {
    /** Pack id, for "play again" and display. */
    id: string;
    title: string;
    covers: string[];
}

export interface RoomSettings {
    source: RoomSource | null;
    difficulty: Difficulty;
    rounds: number;
}

export interface RoomPlayer {
    id: string;
    name: string;
    /** Avatar colour, 0-359. */
    hue: number;
    score: number;
    connected: boolean;
    host: boolean;
}

/** One player's progress on the current song. */
export interface PlayerRound {
    /** Verdict of each guess, oldest first ('skip' for a pass). */
    marks: ('correct' | 'close' | 'wrong' | 'skip')[];
    /** Step the song was named on. */
    solvedStep?: number;
    /** 0 for the first player to name it, and so on. */
    rank?: number;
    points: number;
    /** Step the player has finished with (wrong guess or pass), waiting for the next clip. */
    doneStep?: number;
}

/** What the browser needs to play a song without learning which song it is. */
export interface Clip {
    /** Random per game; used as the audio cache key. */
    key: number;
    preview: string;
    videos: Video[];
}

export interface RoundView {
    index: number;
    total: number;
    /** -1 during the countdown, then 0..5 along the ladder. */
    step: number;
    /** Server time (ms) when the current step began and ends. */
    stepStartedAt: number;
    stepEndsAt: number;
    clip: Clip;
    /** Next song's clip, so it can load during this one. */
    nextClip?: Clip;
    players: Record<string, PlayerRound>;
    /** Only present once the song is revealed. */
    answer?: Song;
}

export interface RoundSummary {
    song: Song;
    /** Points each player earned, by player id. */
    points: Record<string, number>;
    /** Who named it, in order, with the step. */
    solvers: { id: string; step: number }[];
}

export interface RoomView {
    code: string;
    phase: 'lobby' | 'round' | 'reveal' | 'finished';
    players: RoomPlayer[];
    settings: RoomSettings;
    round?: RoundView;
    /** Server time (ms) the reveal moves on. */
    nextAt?: number;
    history: RoundSummary[];
    /** Server clock when this view was sent, to line up countdowns. */
    now: number;
}

/** Fields of a song sent for guess suggestions. */
export type PoolSong = Pick<Song, 'id' | 'title' | 'artist' | 'artwork' | 'year'>;

export type ClientMessage =
    | { t: 'hello'; player: string; name: string }
    | { t: 'rename'; name: string }
    | { t: 'settings'; settings: Partial<RoomSettings> }
    | { t: 'start'; songs: (Song & { intro?: Video })[]; pool: PoolSong[] }
    | { t: 'guess'; song: { id?: number; title: string; artist: string } }
    | { t: 'pass' }
    | { t: 'next' }
    | { t: 'lobby' }
    | { t: 'react'; emoji: Reaction };

export type ServerMessage =
    | { t: 'state'; room: RoomView }
    | { t: 'pool'; songs: PoolSong[] }
    | { t: 'verdict'; verdict: 'correct' | 'close' | 'wrong'; points: number }
    | { t: 'react'; player: string; emoji: Reaction }
    | { t: 'error'; message: string };
