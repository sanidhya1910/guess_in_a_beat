import type { Difficulty } from './types';

export const MAX_ATTEMPTS = 6;

export interface DifficultyInfo {
    id: Difficulty;
    label: string;
    /** Snippet length in seconds for each attempt. */
    ladder: number[];
    multiplier: number;
    description: string;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyInfo> = {
    easy: {
        id: 'easy',
        label: 'Easy',
        ladder: [1, 2, 4, 7, 11, 16],
        multiplier: 1,
        description: 'Starts at 1 second. The classic ladder.',
    },
    normal: {
        id: 'normal',
        label: 'Normal',
        ladder: [0.5, 1, 2, 4, 8, 15],
        multiplier: 1.5,
        description: 'Starts at half a second. 1.5x points.',
    },
    hard: {
        id: 'hard',
        label: 'In a beat',
        ladder: [0.1, 0.5, 1, 2, 5, 10],
        multiplier: 2,
        description: 'Starts at 0.1 seconds. Double points.',
    },
};

const BASE_POINTS = [100, 80, 60, 40, 20, 10];

/** Points for a correct answer on attempt `index` (0-based). */
export function pointsFor(index: number, difficulty: Difficulty): number {
    return Math.round((BASE_POINTS[index] ?? 0) * DIFFICULTIES[difficulty].multiplier);
}

export function formatSeconds(s: number): string {
    return s < 1 ? `${s}s` : `${Number.isInteger(s) ? s : s.toFixed(1)}s`;
}

/** Map a time on the ladder to 0..1 along the timeline. A square-root scale
 *  keeps the very short first steps visible next to the long last one. */
export function timelinePosition(seconds: number, max: number): number {
    return Math.sqrt(Math.max(0, Math.min(seconds, max)) / max);
}
