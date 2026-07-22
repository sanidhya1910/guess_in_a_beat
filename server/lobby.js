import { db } from './db.js';
import { resolveTracks } from './providers.js';
import { isCorrectGuess } from '../src/utils/matching.js';

const DURATIONS = [0.1, 0.5, 1, 2, 5, 10];
const POINTS = [6, 5, 4, 3, 2, 1];
const MAX_ATTEMPTS = DURATIONS.length;
const MAX_PLAYERS_RANGE = [2, 3, 4];
const MAX_SOURCE_LINES = 25; // guard against accidental self-DoS via a huge paste
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity

const shuffle = (array) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const generateCode = () => {
    let code;
    do {
        code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    } while (db.prepare('SELECT 1 FROM lobbies WHERE code = ?').get(code));
    return code;
};

// A 6-char alphanumeric lobby code is only brute-force-safe if join/create
// attempts are throttled. Simple fixed-window in-memory counter per IP —
// no Redis needed at this scale (single process, friends-only game).
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 15;
const rateLimitHits = new Map(); // ip -> { count, windowStart }

const isRateLimited = (ip) => {
    const now = Date.now();
    const entry = rateLimitHits.get(ip);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitHits.set(ip, { count: 1, windowStart: now });
        return false;
    }
    entry.count += 1;
    return entry.count > RATE_LIMIT_MAX;
};

// Per-lobby live round state — deliberately NOT in SQLite. It's high-churn
// (every guess touches it) and only meaningful while players are actively
// connected; only final scores get persisted (see submit_guess below).
const liveLobbies = new Map(); // lobbyId -> { tracks, roundIndex, attempts: Map<playerId, {attemptNum, resolved}> }

const activePlayerCount = (lobbyId) =>
    db.prepare('SELECT COUNT(*) as c FROM lobby_players WHERE lobby_id = ? AND left_at IS NULL').get(lobbyId).c;

const getRoster = (lobbyId) =>
    db.prepare('SELECT id, display_name, is_host, score, correct_count, left_at FROM lobby_players WHERE lobby_id = ?')
        .all(lobbyId)
        .map((p) => ({
            id: p.id,
            displayName: p.display_name,
            isHost: !!p.is_host,
            score: p.score,
            correctCount: p.correct_count,
            connected: !p.left_at,
        }));

export function registerLobbyHandlers(io, { getSpotifyToken, getAppleDeveloperToken }) {
    const broadcastState = (code, lobby) => {
        io.to(code).emit('lobby_state', { status: lobby.status, players: getRoster(lobby.id) });
    };

    const advanceRound = (code, lobbyId) => {
        const state = liveLobbies.get(lobbyId);
        if (!state) return;
        const nextIndex = state.roundIndex + 1;

        if (nextIndex >= state.tracks.length) {
            db.prepare(`UPDATE lobbies SET status = 'finished', finished_at = datetime('now') WHERE id = ?`).run(lobbyId);
            io.to(code).emit('game_over', { lobbyId, finalScores: getRoster(lobbyId) });
            liveLobbies.delete(lobbyId);
            return;
        }

        state.roundIndex = nextIndex;
        state.attempts = new Map();
        io.to(code).emit('round_start', { trackIndex: nextIndex });
    };

    const maybeAdvance = (code, lobbyId) => {
        const state = liveLobbies.get(lobbyId);
        if (!state) return;
        const connectedIds = db
            .prepare('SELECT id FROM lobby_players WHERE lobby_id = ? AND left_at IS NULL')
            .all(lobbyId)
            .map((p) => p.id);
        if (connectedIds.length === 0) return;
        const allResolved = connectedIds.every((id) => state.attempts.get(id)?.resolved);
        if (allResolved) advanceRound(code, lobbyId);
    };

    io.on('connection', (socket) => {
        socket.on('create_lobby', async ({ displayName, provider, sourceInput, trackIds, songLimit, maxPlayers }, ack) => {
            try {
                if (isRateLimited(socket.handshake.address)) return ack({ error: 'Too many attempts — try again in a minute' });
                displayName = (displayName || '').trim().slice(0, 24);
                if (!displayName) return ack({ error: 'Display name is required' });
                if (!MAX_PLAYERS_RANGE.includes(maxPlayers)) return ack({ error: 'Party size must be 2-4 players' });
                if (!['spotify', 'apple', 'deezer', 'itunes'].includes(provider)) return ack({ error: 'Unknown provider' });
                if (sourceInput && sourceInput.split('\n').filter((l) => l.trim()).length > MAX_SOURCE_LINES) {
                    return ack({ error: `Paste at most ${MAX_SOURCE_LINES} links at once` });
                }

                let tracks = await resolveTracks({
                    provider,
                    sourceInput,
                    trackIds,
                    spotifyToken: getSpotifyToken(),
                    getAppleDeveloperToken,
                });
                tracks = shuffle(tracks);
                const limit = parseInt(songLimit, 10);
                if (!isNaN(limit) && limit > 0) tracks = tracks.slice(0, limit);
                if (tracks.length === 0) return ack({ error: 'No tracks found for that input' });

                const code = generateCode();
                const lobbyInfo = db
                    .prepare(
                        `INSERT INTO lobbies (code, host_name, provider, source_input, track_ids, max_players)
                         VALUES (?, ?, ?, ?, ?, ?)`
                    )
                    .run(code, displayName, provider, sourceInput || null, JSON.stringify(tracks.map((t) => t.id)), maxPlayers);
                const lobbyId = lobbyInfo.lastInsertRowid;

                const playerInfo = db
                    .prepare(`INSERT INTO lobby_players (lobby_id, display_name, socket_id, is_host) VALUES (?, ?, ?, 1)`)
                    .run(lobbyId, displayName, socket.id);

                socket.join(code);
                socket.data.lobbyCode = code;
                socket.data.lobbyId = lobbyId;
                socket.data.playerId = playerInfo.lastInsertRowid;

                liveLobbies.set(lobbyId, { tracks, roundIndex: -1, attempts: new Map() });

                ack({ code, lobbyId, playerId: playerInfo.lastInsertRowid, maxPlayers });
                broadcastState(code, { id: lobbyId, status: 'waiting' });
            } catch (err) {
                console.error('create_lobby error:', err.message);
                const status = err.response?.status;
                if (provider === 'spotify' && status === 404) {
                    ack({
                        error:
                            'Spotify no longer lets apps load its own editorial or algorithmic playlists ' +
                            '(like Today’s Top Hits or Discover Weekly), even when public. Try a playlist made by a person, ' +
                            'or use Deezer / Apple Music / iTunes.',
                    });
                } else if (provider === 'spotify' && (status === 401 || status === 403)) {
                    ack({ error: 'Spotify denied access — the host may need to log out and back in.' });
                } else {
                    ack({ error: 'Failed to create lobby — check your links and try again' });
                }
            }
        });

        socket.on('join_lobby', ({ code, displayName }, ack) => {
            try {
                if (isRateLimited(socket.handshake.address)) return ack({ error: 'Too many attempts — try again in a minute' });
                displayName = (displayName || '').trim().slice(0, 24);
                if (!displayName) return ack({ error: 'Display name is required' });

                const lobby = db.prepare('SELECT * FROM lobbies WHERE code = ?').get((code || '').toUpperCase());
                if (!lobby) return ack({ error: 'LOBBY_NOT_FOUND' });
                if (lobby.status !== 'waiting') return ack({ error: 'ALREADY_STARTED' });
                if (activePlayerCount(lobby.id) >= lobby.max_players) return ack({ error: 'LOBBY_FULL' });

                const playerInfo = db
                    .prepare(`INSERT INTO lobby_players (lobby_id, display_name, socket_id, is_host) VALUES (?, ?, ?, 0)`)
                    .run(lobby.id, displayName, socket.id);

                socket.join(lobby.code);
                socket.data.lobbyCode = lobby.code;
                socket.data.lobbyId = lobby.id;
                socket.data.playerId = playerInfo.lastInsertRowid;

                ack({ lobbyId: lobby.id, playerId: playerInfo.lastInsertRowid, provider: lobby.provider, maxPlayers: lobby.max_players });
                broadcastState(lobby.code, lobby);
            } catch (err) {
                console.error('join_lobby error:', err.message);
                ack({ error: 'Failed to join lobby' });
            }
        });

        socket.on('rejoin_lobby', ({ code, playerId }, ack) => {
            const player = db.prepare('SELECT * FROM lobby_players WHERE id = ?').get(playerId);
            const lobby = player && db.prepare('SELECT * FROM lobbies WHERE id = ?').get(player.lobby_id);
            if (!player || !lobby || lobby.code !== code) return ack({ error: 'PLAYER_NOT_FOUND' });

            db.prepare('UPDATE lobby_players SET socket_id = ?, left_at = NULL WHERE id = ?').run(socket.id, playerId);
            socket.join(lobby.code);
            socket.data.lobbyCode = lobby.code;
            socket.data.lobbyId = lobby.id;
            socket.data.playerId = playerId;

            // If a round is already underway, hand the reconnecting client
            // everything it needs to resume mid-game — it otherwise only
            // ever gets game_start/round_start as one-off broadcasts, which
            // a client that (re)connects after they fired would miss.
            const state = liveLobbies.get(lobby.id);
            const inProgress = lobby.status === 'in_progress' && state;
            ack({
                ok: true,
                status: lobby.status,
                provider: lobby.provider,
                ...(inProgress && {
                    tracks: state.tracks,
                    durations: DURATIONS,
                    trackIndex: state.roundIndex,
                }),
            });
            broadcastState(lobby.code, lobby);
        });

        socket.on('start_game', ({ code }, ack) => {
            const lobby = db.prepare('SELECT * FROM lobbies WHERE code = ?').get(code);
            if (!lobby) return ack({ error: 'LOBBY_NOT_FOUND' });
            const player = db.prepare('SELECT * FROM lobby_players WHERE id = ?').get(socket.data.playerId);
            if (!player?.is_host) return ack({ error: 'NOT_HOST' });
            if (lobby.status !== 'waiting') return ack({ error: 'ALREADY_STARTED' });

            const state = liveLobbies.get(lobby.id);
            if (!state) return ack({ error: 'LOBBY_EXPIRED' });

            db.prepare(`UPDATE lobbies SET status = 'in_progress', started_at = datetime('now') WHERE id = ?`).run(lobby.id);
            state.roundIndex = 0;
            state.attempts = new Map();

            io.to(code).emit('game_start', { tracks: state.tracks, durations: DURATIONS });
            io.to(code).emit('round_start', { trackIndex: 0 });
            ack({ ok: true });
            broadcastState(code, { ...lobby, status: 'in_progress' });
        });

        socket.on('submit_guess', ({ code, guessedTrack, attemptNum }, ack) => {
            const lobbyId = socket.data.lobbyId;
            const playerId = socket.data.playerId;
            const state = lobbyId && liveLobbies.get(lobbyId);
            if (!state) return ack?.({ error: 'INVALID' });

            const existing = state.attempts.get(playerId);
            if (existing?.resolved) return ack?.({ error: 'ALREADY_RESOLVED' });

            const targetTrack = state.tracks[state.roundIndex];
            const boundedAttempt = Math.max(0, Math.min(attemptNum, MAX_ATTEMPTS - 1));
            const correct = guessedTrack ? isCorrectGuess(guessedTrack, targetTrack) : false;
            const exhausted = !correct && boundedAttempt >= MAX_ATTEMPTS - 1;

            if (correct) {
                const points = POINTS[boundedAttempt];
                db.prepare('UPDATE lobby_players SET score = score + ?, correct_count = correct_count + 1 WHERE id = ?')
                    .run(points, playerId);
                state.attempts.set(playerId, { attemptNum: boundedAttempt, resolved: true });
            } else if (exhausted) {
                state.attempts.set(playerId, { attemptNum: boundedAttempt, resolved: true });
            } else {
                state.attempts.set(playerId, { attemptNum: boundedAttempt + 1, resolved: false });
            }

            const player = db.prepare('SELECT score, correct_count FROM lobby_players WHERE id = ?').get(playerId);
            io.to(code).emit('score_update', {
                playerId,
                score: player.score,
                correctCount: player.correct_count,
                result: correct ? 'correct' : exhausted ? 'exhausted' : 'wrong',
            });
            ack?.({ correct, exhausted });

            maybeAdvance(code, lobbyId);
        });

        socket.on('disconnect', () => {
            const { lobbyId, playerId, lobbyCode } = socket.data;
            if (!playerId) return;
            db.prepare(`UPDATE lobby_players SET left_at = datetime('now') WHERE id = ?`).run(playerId);
            const lobby = db.prepare('SELECT * FROM lobbies WHERE id = ?').get(lobbyId);
            if (lobby) {
                broadcastState(lobbyCode, lobby);
                if (lobby.status === 'in_progress') maybeAdvance(lobbyCode, lobbyId);
            }
        });
    });
}
