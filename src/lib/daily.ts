import type { DailyCategory, Song } from './types';

/** Calendar date of Daily puzzle #1. */
export const DAILY_EPOCH = '2026-10-03';

const DAY_MS = 86_400_000;

function utcDay(y: number, m: number, d: number): number {
    return Date.UTC(y, m, d) / DAY_MS;
}

/** Days since the epoch, using the player's local calendar date so a new
 *  puzzle unlocks at local midnight everywhere. */
export function dayIndex(epoch: string, now: Date = new Date()): number {
    const [y, m, d] = epoch.split('-').map(Number);
    return utcDay(now.getFullYear(), now.getMonth(), now.getDate()) - utcDay(y, m - 1, d);
}

export function dailySong(category: DailyCategory, index: number): Song {
    const n = category.songs.length;
    return category.songs[((index % n) + n) % n];
}

export function msUntilNextDay(now: Date = new Date()): number {
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return next.getTime() - now.getTime();
}

export function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
