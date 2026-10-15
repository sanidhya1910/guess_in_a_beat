import { judgeGuess, type Verdict } from '../lib/match';
import { MAX_ATTEMPTS, pointsFor } from '../lib/scoring';
import type { Mark } from '../lib/state';
import type { Difficulty, Song } from '../lib/types';

export type Attempt = { kind: 'guess'; verdict: Verdict; song: Song } | { kind: 'skip' };

export interface RoundResult {
    song: Song;
    attempts: Attempt[];
    won: boolean;
    points: number;
}

export interface GameState {
    /** Songs for the rounds, followed by spares used if one fails to load. */
    queue: Song[];
    rounds: number;
    index: number;
    attempts: Attempt[];
    phase: 'guessing' | 'revealed' | 'finished';
    results: RoundResult[];
    score: number;
    difficulty: Difficulty;
}

export type GameAction =
    | { type: 'guess'; song: Song }
    | { type: 'skip' }
    | { type: 'giveUp' }
    | { type: 'next' }
    | { type: 'drop' };

export function initGame(queue: Song[], rounds: number, difficulty: Difficulty, attempts: Attempt[] = []): GameState {
    return {
        queue,
        rounds: Math.min(rounds, queue.length),
        index: 0,
        attempts,
        phase: 'guessing',
        results: [],
        score: 0,
        difficulty,
    };
}

export const markOf = (a: Attempt): Mark => (a.kind === 'skip' ? 'skip' : a.verdict);

function settle(state: GameState, attempts: Attempt[], won: boolean): GameState {
    const points = won ? pointsFor(attempts.length - 1, state.difficulty) : 0;
    return {
        ...state,
        attempts,
        phase: 'revealed',
        score: state.score + points,
        results: [...state.results, { song: state.queue[state.index], attempts, won, points }],
    };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
    const answer = state.queue[state.index];
    switch (action.type) {
        case 'guess': {
            if (state.phase !== 'guessing') return state;
            const verdict = judgeGuess(action.song, answer);
            const attempts: Attempt[] = [...state.attempts, { kind: 'guess', verdict, song: action.song }];
            if (verdict === 'correct') return settle(state, attempts, true);
            if (attempts.length >= MAX_ATTEMPTS) return settle(state, attempts, false);
            return { ...state, attempts };
        }
        case 'skip': {
            if (state.phase !== 'guessing') return state;
            const attempts: Attempt[] = [...state.attempts, { kind: 'skip' }];
            if (attempts.length >= MAX_ATTEMPTS) return settle(state, attempts, false);
            return { ...state, attempts };
        }
        case 'giveUp':
            return state.phase === 'guessing' ? settle(state, state.attempts, false) : state;
        case 'next':
            if (state.phase !== 'revealed') return state;
            if (state.index + 1 >= state.rounds) return { ...state, phase: 'finished' };
            return { ...state, index: state.index + 1, attempts: [], phase: 'guessing' };
        case 'drop': {
            // The current song couldn't be played: swap in a spare, or shorten the game.
            const queue = state.queue.filter((_, i) => i !== state.index);
            const rounds = queue.length >= state.rounds ? state.rounds : queue.length;
            if (state.index >= rounds) return { ...state, queue, rounds, phase: state.results.length ? 'finished' : 'guessing' };
            return { ...state, queue, rounds, attempts: [], phase: 'guessing' };
        }
    }
}
