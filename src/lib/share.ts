import { MAX_ATTEMPTS } from './scoring';
import type { Mark } from './state';

const SQUARES: Record<Mark, string> = {
    correct: '\u{1F7E9}',
    close: '\u{1F7E8}',
    wrong: '\u{1F7E5}',
    skip: '⬛',
};
const UNUSED = '⬜';

export function markRow(marks: Mark[]): string {
    return marks.map((m) => SQUARES[m]).join('') + UNUSED.repeat(Math.max(0, MAX_ATTEMPTS - marks.length));
}

export function siteUrl(path = ''): string {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    return `${window.location.origin}${base}${path}`;
}

export function dailyShareText(puzzle: number, category: { id: string; title: string }, marks: Mark[], won: boolean): string {
    const result = won ? `${marks.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
    return `Name That Beat #${puzzle} ${category.title} ${result}\n\u{1F50A}${markRow(marks)}\n${siteUrl(`/daily/${category.id}`)}`;
}

/** One symbol per song: the try it was named on, or a red square if missed. */
export function gameShareText(opts: {
    title: string;
    score: number;
    correct: number;
    total: number;
    /** Try number for each song, or null when it was missed. */
    tries: (number | null)[];
    link: string;
}): string {
    const cells = opts.tries.map((t) => (t === null ? SQUARES.wrong : `${t}️⃣`));
    const lines: string[] = [];
    for (let i = 0; i < cells.length; i += 10) lines.push(cells.slice(i, i + 10).join(''));
    return [
        `Name That Beat: ${opts.title}`,
        `${opts.score} pts, ${opts.correct}/${opts.total} songs`,
        ...lines,
        `Beat my score: ${opts.link}`,
    ].join('\n');
}

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/** Native share sheet on phones, clipboard everywhere else. */
export async function shareText(text: string): Promise<ShareOutcome> {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    if (coarse && navigator.share) {
        try {
            await navigator.share({ text });
            return 'shared';
        } catch (err) {
            if ((err as Error).name === 'AbortError') return 'shared';
        }
    }
    try {
        await navigator.clipboard.writeText(text);
        return 'copied';
    } catch {
        return 'failed';
    }
}
