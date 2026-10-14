import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, PoolSong, Reaction, RoomView, ServerMessage } from './room-protocol';
import { createStore } from './store';

// Browser side of multiplayer rooms: a WebSocket to the room's Durable Object
// that reconnects on its own, plus the player's identity.

const BASE = import.meta.env.BASE_URL;

export interface Profile {
    /** Random and private; lets a player rejoin a room as themselves. */
    id: string;
    name: string;
}

function newId(): string {
    return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export const profileStore = createStore<Profile>('gib:profile', { id: '', name: '' });
if (!profileStore.get().id) profileStore.set({ id: newId() });

export async function createRoom(): Promise<string> {
    const res = await fetch(`${BASE}api/rooms`, { method: 'POST' });
    if (!res.ok) throw new Error(res.status === 404 ? 'Multiplayer is not available on this site.' : 'Could not create a room.');
    const { code } = (await res.json()) as { code: string };
    return code;
}

/** Whether a room code exists (the room answers 426 to a plain GET). */
export async function roomExists(code: string): Promise<boolean> {
    const res = await fetch(`${BASE}api/rooms/${code}`);
    return res.status !== 404;
}

export type RoomStatus = 'connecting' | 'open' | 'reconnecting' | 'missing' | 'full';

interface RoomHandlers {
    onReact?(player: string, emoji: Reaction): void;
    onVerdict?(verdict: 'correct' | 'close' | 'wrong', points: number): void;
    onError?(message: string): void;
}

export interface RoomConnection {
    status: RoomStatus;
    room: RoomView | null;
    pool: PoolSong[];
    /** Server time minus local time, in ms. */
    offset: number;
    send(msg: ClientMessage): void;
}

const PING_MS = 25_000;

export function useRoom(code: string, name: string, handlers: RoomHandlers): RoomConnection {
    const [status, setStatus] = useState<RoomStatus>('connecting');
    const [room, setRoom] = useState<RoomView | null>(null);
    const [pool, setPool] = useState<PoolSong[]>([]);
    const [offset, setOffset] = useState(0);
    const socket = useRef<WebSocket | null>(null);
    const handlersRef = useRef(handlers);
    const nameRef = useRef(name);

    useEffect(() => {
        handlersRef.current = handlers;
        nameRef.current = name;
    });

    useEffect(() => {
        let alive = true;
        let attempt = 0;
        let retry = 0;
        let ping = 0;

        const connect = () => {
            const url = new URL(`${BASE}api/rooms/${code}`, location.href);
            url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
            const ws = new WebSocket(url);
            socket.current = ws;
            let opened = false;

            ws.onopen = () => {
                opened = true;
                attempt = 0;
                setStatus('open');
                ws.send(JSON.stringify({ t: 'hello', player: profileStore.get().id, name: nameRef.current } satisfies ClientMessage));
                ping = window.setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), PING_MS);
            };
            ws.onmessage = (e) => {
                if (typeof e.data !== 'string' || e.data === 'pong') return;
                let msg: ServerMessage;
                try {
                    msg = JSON.parse(e.data) as ServerMessage;
                } catch {
                    return;
                }
                if (msg.t === 'state') {
                    setRoom(msg.room);
                    setOffset(msg.room.now - Date.now());
                } else if (msg.t === 'pool') setPool(msg.songs);
                else if (msg.t === 'react') handlersRef.current.onReact?.(msg.player, msg.emoji);
                else if (msg.t === 'verdict') handlersRef.current.onVerdict?.(msg.verdict, msg.points);
                else if (msg.t === 'error') handlersRef.current.onError?.(msg.message);
            };
            ws.onclose = async (e) => {
                window.clearInterval(ping);
                if (!alive || socket.current !== ws) return;
                if (e.code === 4003) return setStatus('full');
                if (!opened && attempt === 0 && !(await roomExists(code).catch(() => true))) return alive && setStatus('missing');
                if (!alive) return;
                setStatus('reconnecting');
                retry = window.setTimeout(connect, Math.min(8000, 800 * 2 ** attempt++));
            };
        };

        connect();
        // Reconnect straight away when the tab comes back (mobile browsers drop sockets in the background).
        const onVisible = () => {
            const ws = socket.current;
            if (document.visibilityState === 'visible' && ws && ws.readyState > WebSocket.OPEN) {
                window.clearTimeout(retry);
                attempt = 0;
                connect();
            }
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            alive = false;
            window.clearTimeout(retry);
            window.clearInterval(ping);
            document.removeEventListener('visibilitychange', onVisible);
            socket.current?.close(1000, 'leaving');
            socket.current = null;
        };
    }, [code]);

    const send = useCallback((msg: ClientMessage) => {
        const ws = socket.current;
        if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    }, []);

    return { status, room, pool, offset, send };
}
