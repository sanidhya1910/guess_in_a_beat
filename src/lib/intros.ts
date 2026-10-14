import type { Video } from './room-protocol';

// Where each pack song's music starts on YouTube, measured ahead of time by
// scripts/build-intros.ts. Loaded on first use as its own chunk.

/** Start a hair before the measured end of the silence so the first note isn't clipped. */
const PREROLL = 0.03;

let table: Promise<Record<string, [string, number]>> | null = null;

function load(): Promise<Record<string, [string, number]>> {
    table ??= import('../data/intros.json').then(
        (m) => m.default as unknown as Record<string, [string, number]>,
        () => {
            table = null;
            return {};
        },
    );
    return table;
}

/** The measured video for a song, if there is one. */
export async function introFor(songId: number): Promise<Video | undefined> {
    const entry = (await load())[songId];
    return entry ? { id: entry[0], start: Math.max(0, entry[1] - PREROLL) } : undefined;
}
