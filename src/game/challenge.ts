import { MAX_CUSTOM_SONGS } from '../lib/custom';
import { DIFFICULTIES } from '../lib/scoring';
import type { Difficulty } from '../lib/types';
import type { Challenge } from './GameSession';

/** Read seed, difficulty, rounds and a friend's score from a shared link. */
export function parseChallenge(query: URLSearchParams): Challenge {
    const d = query.get('d');
    const n = Number(query.get('n'));
    const s = query.get('s');
    const seed = query.get('seed');
    return {
        seed: seed && /^[a-z0-9]{1,16}$/i.test(seed) ? seed : undefined,
        difficulty: d && d in DIFFICULTIES ? (d as Difficulty) : undefined,
        rounds: Number.isInteger(n) && n > 0 && n <= MAX_CUSTOM_SONGS ? n : undefined,
        score: s !== null && /^\d{1,6}$/.test(s) ? Number(s) : undefined,
    };
}
