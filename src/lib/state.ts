import { detectRegion } from './region';
import { createStore } from './store';
import type { Difficulty } from './types';

export type Mark = 'correct' | 'close' | 'wrong' | 'skip';
export type Theme = 'system' | 'dark' | 'light';

// ── Settings ────────────────────────────────────────────────────────────────

export interface Settings {
    difficulty: Difficulty;
    rounds: number;
    region: string;
    volume: number;
    theme: Theme;
    seenHelp: boolean;
}

export const settingsStore = createStore<Settings>('gib:settings', {
    difficulty: 'normal',
    rounds: 10,
    region: detectRegion(),
    volume: 0.8,
    theme: 'system',
    seenHelp: false,
});

// ── Daily Challenge history ─────────────────────────────────────────────────

export interface DailyRecord {
    songId: number;
    marks: Mark[];
    /** What was guessed on each attempt (null for skips), to restore progress. */
    guesses: ({ title: string; artist: string } | null)[];
    outcome: 'playing' | 'won' | 'lost';
}

export interface DailyState {
    history: Record<number, DailyRecord>;
}

export const dailyStore = createStore<DailyState>('gib:daily', { history: {} });

export interface DailyStats {
    played: number;
    wins: number;
    currentStreak: number;
    maxStreak: number;
    /** Wins on attempt 1..6, then losses. */
    distribution: number[];
}

export function dailyStats(history: Record<number, DailyRecord>, today: number): DailyStats {
    const finished = Object.entries(history)
        .map(([day, rec]) => ({ day: Number(day), rec }))
        .filter(({ rec }) => rec.outcome !== 'playing')
        .sort((a, b) => a.day - b.day);

    const distribution = [0, 0, 0, 0, 0, 0, 0];
    let maxStreak = 0;
    let run = 0;
    let prevWonDay: number | null = null;
    for (const { day, rec } of finished) {
        if (rec.outcome === 'won') {
            distribution[Math.min(rec.marks.length, 6) - 1]++;
            run = prevWonDay !== null && day === prevWonDay + 1 ? run + 1 : 1;
            prevWonDay = day;
        } else {
            distribution[6]++;
            run = 0;
            prevWonDay = null;
        }
        maxStreak = Math.max(maxStreak, run);
    }

    // The current streak survives until a day is missed: count back from
    // today if it is already won, otherwise from yesterday.
    let currentStreak = 0;
    let day = history[today]?.outcome === 'won' ? today : today - 1;
    while (history[day]?.outcome === 'won') {
        currentStreak++;
        day--;
    }

    return {
        played: finished.length,
        wins: finished.filter((f) => f.rec.outcome === 'won').length,
        currentStreak,
        maxStreak,
        distribution,
    };
}

// ── Records for packs, artists and custom games ─────────────────────────────

export interface PackRecord {
    title: string;
    best: number;
    plays: number;
}

export interface RecordsState {
    packs: Record<string, PackRecord>;
    songsPlayed: number;
    songsCorrect: number;
    gamesPlayed: number;
}

export const recordsStore = createStore<RecordsState>('gib:records', {
    packs: {},
    songsPlayed: 0,
    songsCorrect: 0,
    gamesPlayed: 0,
});

export const recordKey = (id: string, difficulty: Difficulty) => `${id}:${difficulty}`;

/** Saves a finished game and reports whether it set a new best. */
export function saveGame(key: string, title: string, score: number, songs: number, correct: number): boolean {
    let isBest = false;
    recordsStore.set((s) => {
        const prev = s.packs[key];
        isBest = score > 0 && (!prev || score > prev.best);
        const record = { title, best: Math.max(prev?.best ?? 0, score), plays: (prev?.plays ?? 0) + 1 };
        return {
            packs: { ...s.packs, [key]: record },
            songsPlayed: s.songsPlayed + songs,
            songsCorrect: s.songsCorrect + correct,
            gamesPlayed: s.gamesPlayed + 1,
        };
    });
    return isBest;
}

export function resetAllProgress() {
    dailyStore.set({ history: {} });
    recordsStore.set({ packs: {}, songsPlayed: 0, songsCorrect: 0, gamesPlayed: 0 });
}
