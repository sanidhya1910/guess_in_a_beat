import { describe, expect, it } from 'vitest';
import { gameReducer, initGame } from '../game/reducer';
import { dailySong, dayIndex, formatCountdown } from './daily';
import { createRng, shuffle } from './rng';
import { pointsFor, timelinePosition } from './scoring';
import { gameShareText, markRow } from './share';
import { combinedHistory, dailyStats, type DailyRecord } from './state';
import type { Song } from './types';

const song = (id: number, title: string, artist = 'Artist'): Song => ({
    id,
    title,
    artist,
    album: '',
    artwork: '',
    preview: `https://example.com/${id}.m4a`,
});

describe('rng', () => {
    it('is deterministic per seed', () => {
        const a = createRng('abc');
        const b = createRng('abc');
        expect([a(), a(), a()]).toEqual([b(), b(), b()]);
        expect(createRng('abc')()).not.toBe(createRng('abd')());
    });

    it('shuffles reproducibly without losing items', () => {
        const items = Array.from({ length: 50 }, (_, i) => i);
        const one = shuffle(items, 'seed1');
        expect(shuffle(items, 'seed1')).toEqual(one);
        expect([...one].sort((x, y) => x - y)).toEqual(items);
        expect(shuffle(items, 'seed2')).not.toEqual(one);
    });
});

describe('daily', () => {
    it('counts local calendar days from the epoch', () => {
        expect(dayIndex('2026-10-03', new Date(2026, 9, 3, 0, 5))).toBe(0);
        expect(dayIndex('2026-10-03', new Date(2026, 9, 3, 23, 59))).toBe(0);
        expect(dayIndex('2026-10-03', new Date(2026, 9, 4, 0, 0))).toBe(1);
        // Across a DST change in many regions.
        expect(dayIndex('2026-10-03', new Date(2026, 10, 3, 12))).toBe(31);
    });

    it('cycles through the schedule', () => {
        const data = { id: 'pop', title: 'Pop', blurb: '', songs: [song(1, 'a'), song(2, 'b'), song(3, 'c')] };
        expect(dailySong(data, 0).id).toBe(1);
        expect(dailySong(data, 4).id).toBe(2);
        expect(dailySong(data, -1).id).toBe(3);
    });

    it('formats the countdown', () => {
        expect(formatCountdown(3_723_000)).toBe('01:02:03');
        expect(formatCountdown(-5)).toBe('00:00:00');
    });

    it('computes streaks and the distribution', () => {
        const rec = (outcome: DailyRecord['outcome'], tries: number): DailyRecord => ({
            songId: 1,
            marks: Array.from({ length: tries }, (_, i) => (i === tries - 1 && outcome === 'won' ? 'correct' : 'wrong')),
            guesses: [],
            outcome,
        });
        const history = { 1: rec('won', 2), 2: rec('won', 1), 3: rec('lost', 6), 4: rec('won', 3), 5: rec('won', 3), 6: rec('playing', 1) };
        const stats = dailyStats(history, 6);
        expect(stats.played).toBe(5);
        expect(stats.wins).toBe(4);
        expect(stats.maxStreak).toBe(2);
        // Today is still in progress, so the streak counts through yesterday.
        expect(stats.currentStreak).toBe(2);
        expect(stats.distribution).toEqual([1, 1, 2, 0, 0, 0, 1]);
        expect(dailyStats(history, 8).currentStreak).toBe(0);
    });

    it('combines categories into one record per day', () => {
        const rec = (outcome: DailyRecord['outcome'], tries: number): DailyRecord => ({ songId: tries, marks: Array(tries).fill('wrong'), guesses: [], outcome });
        const combined = combinedHistory({
            history: { 1: rec('won', 4) },
            categories: {
                pop: { 2: rec('lost', 6), 3: rec('won', 3) },
                rock: { 2: rec('won', 5), 3: rec('won', 2), 4: rec('playing', 1) },
            },
        });
        // Pre-category records are kept; any solved category wins the day, with the fewest tries.
        expect(combined[1].marks.length).toBe(4);
        expect(combined[2].outcome).toBe('won');
        expect(combined[3].marks.length).toBe(2);
        expect(combined[4].outcome).toBe('playing');
        expect(dailyStats(combined, 3).currentStreak).toBe(3);
    });
});

describe('scoring', () => {
    it('scales points by difficulty', () => {
        expect(pointsFor(0, 'easy')).toBe(100);
        expect(pointsFor(0, 'normal')).toBe(150);
        expect(pointsFor(0, 'hard')).toBe(200);
        expect(pointsFor(5, 'hard')).toBe(20);
        expect(pointsFor(6, 'hard')).toBe(0);
    });

    it('maps time onto the timeline with a square-root scale', () => {
        expect(timelinePosition(0, 16)).toBe(0);
        expect(timelinePosition(16, 16)).toBe(1);
        expect(timelinePosition(4, 16)).toBe(0.5);
        expect(timelinePosition(99, 16)).toBe(1);
    });
});

describe('game reducer', () => {
    const queue = [song(1, 'One'), song(2, 'Two'), song(3, 'Three')];

    it('scores a correct guess and advances', () => {
        let s = initGame(queue, 2, 'normal');
        s = gameReducer(s, { type: 'skip' });
        s = gameReducer(s, { type: 'guess', song: queue[0] });
        expect(s.phase).toBe('revealed');
        expect(s.score).toBe(120);
        s = gameReducer(s, { type: 'next' });
        expect(s.index).toBe(1);
        expect(s.attempts).toEqual([]);
        s = gameReducer(s, { type: 'giveUp' });
        s = gameReducer(s, { type: 'next' });
        expect(s.phase).toBe('finished');
        expect(s.results.map((r) => r.won)).toEqual([true, false]);
    });

    it('ends the round after six misses', () => {
        let s = initGame(queue, 1, 'easy');
        for (let i = 0; i < 6; i++) s = gameReducer(s, { type: 'guess', song: song(100 + i, `Wrong ${i}`, 'Other') });
        expect(s.phase).toBe('revealed');
        expect(s.results[0].won).toBe(false);
        expect(s.score).toBe(0);
    });

    it('ignores guesses once revealed', () => {
        let s = initGame(queue, 1, 'easy');
        s = gameReducer(s, { type: 'giveUp' });
        expect(gameReducer(s, { type: 'guess', song: queue[0] })).toBe(s);
    });

    it('swaps in a spare when a song cannot play', () => {
        let s = initGame(queue, 2, 'easy');
        s = gameReducer(s, { type: 'drop' });
        expect(s.queue.map((x) => x.id)).toEqual([2, 3]);
        expect(s.rounds).toBe(2);
        s = gameReducer(s, { type: 'drop' });
        expect(s.rounds).toBe(1);
    });
});

describe('share', () => {
    it('pads the mark row to six squares', () => {
        expect(markRow(['wrong', 'correct'])).toBe('\u{1F7E5}\u{1F7E9}⬜⬜⬜⬜');
    });

    it('summarises a pack game in one symbol per song', () => {
        const text = gameShareText({ title: '80s Hits', score: 230, correct: 2, total: 3, tries: [1, null, 4], link: 'https://x.test/p' });
        expect(text.split('\n')).toEqual([
            'Name That Beat: 80s Hits',
            '230 pts, 2/3 songs',
            '1️⃣\u{1F7E5}4️⃣',
            'Beat my score: https://x.test/p',
        ]);
    });
});
