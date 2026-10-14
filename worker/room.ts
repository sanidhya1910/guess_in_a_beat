import { DurableObject } from 'cloudflare:workers';
import { judgeGuess } from '../src/lib/match';
import {
    cleanName,
    COUNTDOWN_MS,
    GUESS_WINDOW_MS,
    MAX_NAME,
    MAX_PLAYERS,
    REACTIONS,
    REVEAL_MS,
    ROUND_CHOICES,
    SPEED_BONUS,
    type ClientMessage,
    type Clip,
    type PlayerRound,
    type PoolSong,
    type RoomSettings,
    type RoomView,
    type RoundSummary,
    type ServerMessage,
    type Video,
} from '../src/lib/room-protocol';
import { DIFFICULTIES, MAX_ATTEMPTS, pointsFor } from '../src/lib/scoring';
import type { Difficulty, Song } from '../src/lib/types';
import { cachedVideos } from './videos';

// One multiplayer room. Players connect over WebSockets (hibernatable, so an
// idle room costs nothing) and the room runs the game:
//
//   lobby -> round (countdown, then clip steps 0..5) -> reveal -> ... -> finished
//
// Every player hears the same clip at the same time. The clip gets longer each
// step; naming the song earlier scores more, and the first three to name it get
// a bonus. A wrong guess or a pass sits the player out until the next clip.
// The answer never leaves the server until the reveal, and guesses are judged
// here.
//
// The whole room is one small object saved to storage after every change, so
// it survives the object being evicted between messages.

interface Player {
    id: string;
    name: string;
    hue: number;
    score: number;
}

interface GameSong {
    song: Song;
    clip: Clip;
    /** Whether a YouTube lookup has been tried (it may have found nothing). */
    resolved: boolean;
}

interface Round {
    index: number;
    step: number;
    stepStartedAt: number;
    stepEndsAt: number;
    players: Record<string, PlayerRound>;
}

interface State {
    code: string;
    host: string | null;
    players: Player[];
    settings: RoomSettings;
    phase: RoomView['phase'];
    songs: GameSong[];
    pool: PoolSong[];
    rounds: number;
    round?: Round;
    nextAt?: number;
    history: RoundSummary[];
    /** Delete the room at this time if nobody is connected. */
    expireAt?: number;
}

interface Attachment {
    player?: string;
}

const EMPTY_ROOM_TTL = 30 * 60_000;
const MAX_SONGS = 30;
const MAX_POOL = 400;
const MAX_MESSAGE = 256 * 1024;
const REACTION_GAP_MS = 600;
const HUES = [12, 210, 140, 45, 280, 330, 175, 95, 245, 25, 300, 190];

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const isUrl = (v: string) => /^https:\/\/[^\s]+$/.test(v);

function cleanSong(raw: unknown): Song | null {
    if (!raw || typeof raw !== 'object') return null;
    const s = raw as Record<string, unknown>;
    const id = num(s.id);
    const title = str(s.title, 300);
    const artist = str(s.artist, 300);
    const preview = str(s.preview, 1000);
    if (id === undefined || !title || !artist || !isUrl(preview)) return null;
    const artwork = str(s.artwork, 1000);
    const url = str(s.url, 1000);
    return {
        id,
        title,
        artist,
        album: str(s.album, 300),
        artwork: isUrl(artwork) ? artwork : '',
        preview,
        year: num(s.year),
        genre: str(s.genre, 100) || undefined,
        url: isUrl(url) ? url : undefined,
        duration: num(s.duration),
    };
}

function cleanVideo(raw: unknown): Video | null {
    if (!raw || typeof raw !== 'object') return null;
    const v = raw as Record<string, unknown>;
    const id = str(v.id, 20);
    const start = num(v.start) ?? 0;
    return /^[\w-]{6,20}$/.test(id) ? { id, start: Math.max(0, Math.min(start, 30)) } : null;
}

export class Room extends DurableObject<Env> {
    private state: State | null = null;
    private lastReaction = new Map<string, number>();
    /** Sockets whose close is being handled; they can still be listed meanwhile. */
    private closing = new WeakSet<WebSocket>();

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        // Keep-alive pings are answered without waking the room.
        ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
        ctx.blockConcurrencyWhile(async () => {
            this.state = (await ctx.storage.get<State>('room')) ?? null;
        });
    }

    /** Claims this room for `code`. False if it is already in use. */
    async create(code: string): Promise<boolean> {
        if (this.state) return false;
        this.state = {
            code,
            host: null,
            players: [],
            settings: { source: null, difficulty: 'normal', rounds: 10 },
            phase: 'lobby',
            songs: [],
            pool: [],
            rounds: 0,
            history: [],
            expireAt: Date.now() + EMPTY_ROOM_TTL,
        };
        await this.commit();
        return true;
    }

    async fetch(request: Request): Promise<Response> {
        // A plain GET (no upgrade) is how the app checks that a room exists.
        if (!this.state) return new Response('Room not found', { status: 404 });
        if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
            return new Response('Expected a WebSocket', { status: 426 });
        }
        const pair = new WebSocketPair();
        this.ctx.acceptWebSocket(pair[1]);
        pair[1].serializeAttachment({} satisfies Attachment);
        return new Response(null, { status: 101, webSocket: pair[0] });
    }

    async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
        const s = this.state;
        if (!s || typeof data !== 'string' || data.length > MAX_MESSAGE) return;
        let msg: ClientMessage;
        try {
            msg = JSON.parse(data) as ClientMessage;
        } catch {
            return;
        }
        if (msg.t === 'hello') return this.hello(ws, msg.player, msg.name);

        const player = (ws.deserializeAttachment() as Attachment | null)?.player;
        if (!player || !s.players.some((p) => p.id === player)) return;
        const isHost = s.host === player;

        switch (msg.t) {
            case 'rename': {
                const name = cleanName(str(msg.name, MAX_NAME * 2));
                const p = s.players.find((x) => x.id === player);
                if (p && name) p.name = name;
                break;
            }
            case 'settings':
                if (!isHost || s.phase !== 'lobby') return;
                this.applySettings(msg.settings);
                break;
            case 'start':
                if (!isHost || (s.phase !== 'lobby' && s.phase !== 'finished')) return;
                if (!this.startGame(msg.songs, msg.pool)) return this.send(ws, { t: 'error', message: 'Those songs could not be used.' });
                break;
            case 'guess':
                this.guess(ws, player, msg.song);
                break;
            case 'pass':
                this.pass(player);
                break;
            case 'next':
                if (!isHost || s.phase !== 'reveal') return;
                this.nextSong();
                break;
            case 'lobby':
                if (!isHost || s.phase === 'lobby') return;
                s.phase = 'lobby';
                s.round = undefined;
                s.nextAt = undefined;
                break;
            case 'react': {
                if (!REACTIONS.includes(msg.emoji)) return;
                const now = Date.now();
                if (now - (this.lastReaction.get(player) ?? 0) < REACTION_GAP_MS) return;
                this.lastReaction.set(player, now);
                return this.broadcast({ t: 'react', player, emoji: msg.emoji });
            }
            default:
                return;
        }
        await this.commit();
    }

    async webSocketClose(ws: WebSocket, code: number) {
        try {
            ws.close(code === 1005 ? 1000 : code, 'bye');
        } catch {
            // already closed
        }
        await this.left(ws);
    }

    async webSocketError(ws: WebSocket) {
        await this.left(ws);
    }

    async alarm() {
        const s = this.state;
        if (!s) return;
        const now = Date.now() + 25; // alarms can fire a touch early
        if (s.expireAt && now >= s.expireAt && this.connected().size === 0) {
            this.state = null;
            await this.ctx.storage.deleteAll();
            return;
        }
        if (s.phase === 'round' && s.round && now >= s.round.stepEndsAt) this.advanceStep();
        else if (s.phase === 'reveal' && s.nextAt && now >= s.nextAt) this.nextSong();
        await this.commit();
    }

    // ── Players ─────────────────────────────────────────────────────────────

    private async hello(ws: WebSocket, id: unknown, rawName: unknown) {
        const s = this.state!;
        const player = str(id, 64);
        if (!/^[\w-]{8,64}$/.test(player)) return;
        const name = cleanName(str(rawName, MAX_NAME * 2)) || 'Player';
        let p = s.players.find((x) => x.id === player);
        if (!p) {
            const connected = this.connected();
            if ([...connected].filter((x) => s.players.some((q) => q.id === x)).length >= MAX_PLAYERS) {
                this.send(ws, { t: 'error', message: 'This room is full.' });
                ws.close(4003, 'full');
                return;
            }
            const used = new Set(s.players.map((x) => x.hue));
            p = { id: player, name, hue: HUES.find((h) => !used.has(h)) ?? Math.floor(Math.random() * 360), score: 0 };
            s.players.push(p);
        } else {
            p.name = name;
        }
        ws.serializeAttachment({ player } satisfies Attachment);
        if (!s.host || !this.connected().has(s.host)) s.host = player;
        s.expireAt = undefined;
        if (s.phase !== 'lobby' && s.pool.length) this.send(ws, { t: 'pool', songs: s.pool });
        await this.commit();
    }

    private async left(ws: WebSocket) {
        const s = this.state;
        this.closing.add(ws);
        if (!s) return;
        const connected = this.connected();
        if (s.host && !connected.has(s.host)) {
            s.host = s.players.find((p) => connected.has(p.id))?.id ?? s.host;
        }
        if (connected.size === 0) s.expireAt = Date.now() + EMPTY_ROOM_TTL;
        // Players who never got anywhere in the lobby can go; everyone else keeps their score.
        if (s.phase === 'lobby') s.players = s.players.filter((p) => connected.has(p.id) || p.id === s.host);
        if (s.phase === 'round') this.checkProgress();
        await this.commit();
    }

    private connected(): Set<string> {
        const ids = new Set<string>();
        for (const ws of this.ctx.getWebSockets()) {
            if (this.closing.has(ws) || ws.readyState !== WebSocket.OPEN) continue;
            const player = (ws.deserializeAttachment() as Attachment | null)?.player;
            if (player) ids.add(player);
        }
        return ids;
    }

    // ── Game flow ───────────────────────────────────────────────────────────

    private applySettings(raw: Partial<RoomSettings>) {
        const s = this.state!;
        if (raw.difficulty && raw.difficulty in DIFFICULTIES) s.settings.difficulty = raw.difficulty as Difficulty;
        if (raw.rounds && ROUND_CHOICES.includes(raw.rounds)) s.settings.rounds = raw.rounds;
        if (raw.source && typeof raw.source === 'object') {
            const covers = Array.isArray(raw.source.covers) ? raw.source.covers.map((c) => str(c, 1000)).filter(isUrl).slice(0, 4) : [];
            const id = str(raw.source.id, 80);
            const title = str(raw.source.title, 120);
            if (id && title) s.settings.source = { id, title, covers };
        }
    }

    private startGame(rawSongs: unknown, rawPool: unknown): boolean {
        const s = this.state!;
        if (!Array.isArray(rawSongs)) return false;
        const songs: GameSong[] = [];
        for (const raw of rawSongs.slice(0, MAX_SONGS)) {
            const song = cleanSong(raw);
            if (!song) continue;
            const intro = cleanVideo((raw as { intro?: unknown }).intro);
            songs.push({
                song,
                clip: { key: 1 + Math.floor(Math.random() * 2 ** 40), preview: song.preview, videos: intro ? [intro] : [] },
                resolved: !!intro,
            });
        }
        if (!songs.length) return false;
        const pool: PoolSong[] = [];
        for (const raw of Array.isArray(rawPool) ? rawPool.slice(0, MAX_POOL) : []) {
            const song = cleanSong({ ...(raw as object), preview: 'https://x' });
            if (song) pool.push({ id: song.id, title: song.title, artist: song.artist, artwork: song.artwork, year: song.year });
        }

        s.songs = songs;
        s.pool = pool;
        s.rounds = Math.min(s.settings.rounds, songs.length);
        s.history = [];
        for (const p of s.players) p.score = 0;
        this.broadcast({ t: 'pool', songs: pool });
        this.startRound(0);
        return true;
    }

    private startRound(index: number) {
        const s = this.state!;
        const now = Date.now();
        s.phase = 'round';
        s.nextAt = undefined;
        s.round = { index, step: -1, stepStartedAt: now, stepEndsAt: now + COUNTDOWN_MS, players: {} };
        // Look up this song (if needed) during the countdown, and the next one ahead of time.
        this.resolve(index);
        this.resolve(index + 1);
    }

    private resolve(index: number) {
        const s = this.state!;
        const entry = s.songs[index];
        if (!entry || entry.resolved || index >= s.rounds) return;
        entry.resolved = true;
        const { artist, title, duration } = entry.song;
        void cachedVideos(artist, title, duration, (p) => this.ctx.waitUntil(p)).then(async (ids) => {
            if (!ids) {
                entry.resolved = false; // try again next time it comes up
                return;
            }
            entry.clip.videos = ids.map((id) => ({ id, start: 0 }));
            const r = this.state?.round;
            if (this.state === s && r && (r.index === index || r.index + 1 === index)) await this.commit();
            else await this.save();
        });
    }

    private stepLength(step: number): number {
        const ladder = DIFFICULTIES[this.state!.settings.difficulty].ladder;
        return step < 0 ? COUNTDOWN_MS : ladder[step] * 1000 + GUESS_WINDOW_MS;
    }

    private advanceStep() {
        const r = this.state!.round!;
        if (r.step + 1 >= MAX_ATTEMPTS) return this.reveal();
        const now = Date.now();
        r.step++;
        r.stepStartedAt = now;
        r.stepEndsAt = now + this.stepLength(r.step);
    }

    private guess(ws: WebSocket, player: string, raw: { id?: number; title: string; artist: string }) {
        const s = this.state!;
        const r = s.round;
        if (s.phase !== 'round' || !r || r.step < 0) return;
        const pr = (r.players[player] ??= { marks: [], points: 0 });
        if (pr.solvedStep !== undefined || pr.doneStep === r.step) return;
        const guess = { id: num(raw?.id), title: str(raw?.title, 300), artist: str(raw?.artist, 300) };
        if (!guess.title) return;

        const verdict = judgeGuess(guess, s.songs[r.index].song);
        pr.marks.push(verdict);
        if (verdict === 'correct') {
            const rank = Object.values(r.players).filter((x) => x.solvedStep !== undefined).length;
            pr.solvedStep = r.step;
            pr.rank = rank;
            pr.points = pointsFor(r.step, s.settings.difficulty) + (SPEED_BONUS[rank] ?? 0);
            const p = s.players.find((x) => x.id === player);
            if (p) p.score += pr.points;
        } else {
            pr.doneStep = r.step;
        }
        this.send(ws, { t: 'verdict', verdict, points: pr.points });
        this.checkProgress();
    }

    private pass(player: string) {
        const s = this.state!;
        const r = s.round;
        if (s.phase !== 'round' || !r || r.step < 0) return;
        const pr = (r.players[player] ??= { marks: [], points: 0 });
        if (pr.solvedStep !== undefined || pr.doneStep === r.step) return;
        pr.marks.push('skip');
        pr.doneStep = r.step;
        this.checkProgress();
    }

    /** Move on early once nobody connected is still listening to this clip. */
    private checkProgress() {
        const s = this.state!;
        const r = s.round;
        if (!r || r.step < 0) return;
        const connected = this.connected();
        const active = s.players.filter((p) => connected.has(p.id));
        if (!active.length) return;
        const status = active.map((p) => r.players[p.id]);
        if (status.every((x) => x?.solvedStep !== undefined)) return this.reveal();
        if (status.every((x) => x && (x.solvedStep !== undefined || x.doneStep === r.step))) this.advanceStep();
    }

    private reveal() {
        const s = this.state!;
        const r = s.round!;
        const points: Record<string, number> = {};
        const solvers: RoundSummary['solvers'] = [];
        for (const [id, pr] of Object.entries(r.players)) {
            points[id] = pr.points;
            if (pr.solvedStep !== undefined) solvers.push({ id, step: pr.solvedStep });
        }
        solvers.sort((a, b) => (r.players[a.id].rank ?? 0) - (r.players[b.id].rank ?? 0));
        s.history.push({ song: s.songs[r.index].song, points, solvers });
        s.phase = 'reveal';
        s.nextAt = Date.now() + REVEAL_MS;
    }

    private nextSong() {
        const s = this.state!;
        const next = (s.round?.index ?? -1) + 1;
        if (next < s.rounds) return this.startRound(next);
        s.phase = 'finished';
        s.nextAt = undefined;
    }

    // ── Output ──────────────────────────────────────────────────────────────

    private view(): RoomView {
        const s = this.state!;
        const connected = this.connected();
        const r = s.round;
        return {
            code: s.code,
            phase: s.phase,
            players: s.players.map((p) => ({ ...p, connected: connected.has(p.id), host: p.id === s.host })),
            settings: s.settings,
            round:
                r && (s.phase === 'round' || s.phase === 'reveal')
                    ? {
                          index: r.index,
                          total: s.rounds,
                          step: r.step,
                          stepStartedAt: r.stepStartedAt,
                          stepEndsAt: r.stepEndsAt,
                          clip: s.songs[r.index].clip,
                          nextClip: r.index + 1 < s.rounds ? s.songs[r.index + 1].clip : undefined,
                          players: r.players,
                          answer: s.phase === 'reveal' ? s.songs[r.index].song : undefined,
                      }
                    : undefined,
            nextAt: s.nextAt,
            history: s.history,
            now: Date.now(),
        };
    }

    private send(ws: WebSocket, msg: ServerMessage) {
        try {
            ws.send(JSON.stringify(msg));
        } catch {
            // socket closing
        }
    }

    private broadcast(msg: ServerMessage) {
        const data = JSON.stringify(msg);
        for (const ws of this.ctx.getWebSockets()) {
            if (!(ws.deserializeAttachment() as Attachment | null)?.player) continue;
            try {
                ws.send(data);
            } catch {
                // socket closing
            }
        }
    }

    private async save() {
        if (this.state) await this.ctx.storage.put('room', this.state);
    }

    /** Save, tell everyone, and set the alarm for the next deadline. */
    private async commit() {
        const s = this.state;
        if (!s) return;
        await this.save();
        this.broadcast({ t: 'state', room: this.view() });
        const deadlines = [s.phase === 'round' ? s.round?.stepEndsAt : undefined, s.phase === 'reveal' ? s.nextAt : undefined, s.expireAt];
        const next = Math.min(...deadlines.filter((d): d is number => d !== undefined));
        if (Number.isFinite(next)) await this.ctx.storage.setAlarm(next);
        else await this.ctx.storage.deleteAlarm();
    }
}
