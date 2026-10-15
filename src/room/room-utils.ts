import { useEffect, useState } from 'react';
import { introFor } from '../lib/intros';
import { loadPackSongs } from '../lib/packs';
import { randomSeed, shuffle } from '../lib/rng';
import type { ClientMessage, RoomView } from '../lib/room-protocol';

export const avatarColor = (hue: number) => `hsl(${hue} 70% 58%)`;

/** Server time in ms, re-rendering the caller every `every` ms. */
export function useServerNow(offset: number, every = 100): number {
    const [now, setNow] = useState(() => Date.now() + offset);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now() + offset), every);
        return () => window.clearInterval(timer);
    }, [offset, every]);
    return now;
}

/** Host only: pick this game's songs from the room's pack and start. */
export async function startRoomGame(room: RoomView, send: (msg: ClientMessage) => void) {
    const source = room.settings.source;
    if (!source) throw new Error('Pick a pack first.');
    const songs = await loadPackSongs(source.id);
    const picked = shuffle(songs, randomSeed()).slice(0, room.settings.rounds);
    const withIntros = await Promise.all(picked.map(async (s) => ({ ...s, intro: await introFor(s.id) })));
    send({
        t: 'start',
        songs: withIntros,
        pool: songs.map(({ id, title, artist, artwork, year }) => ({ id, title, artist, artwork, year })),
    });
}
