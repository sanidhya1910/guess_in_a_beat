import 'dotenv/config';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';
import { registerLobbyHandlers } from './lobby.js';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5173;

// In production, self-hosters set CORS_ORIGIN to their real domain; in dev
// the app and this server share an origin anyway (single process), so the
// localhost defaults are just a safety net for direct API testing.
const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://127.0.0.1:5173', 'http://localhost:5173'];

const spotify_client_id = process.env.SPOTIFY_CLIENT_ID;
const spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = `http://127.0.0.1:${port}/auth/callback`;

if (!spotify_client_id || !spotify_client_secret) {
    console.error('FATAL: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env');
    process.exit(1);
}

const apple_team_id = process.env.APPLE_TEAM_ID;
const apple_key_id = process.env.APPLE_KEY_ID;
const apple_private_key = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const appleConfigured = Boolean(apple_team_id && apple_key_id && apple_private_key);

if (!appleConfigured) {
    console.warn('[apple-auth] APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY missing from .env — Apple Music is disabled.');
}

// Keep the dev server alive: a single bad request or provider hiccup should
// never take the whole process down (which is what forced re-running
// `npm run dev`). Log and carry on instead of crashing.
process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
});

let apple_developer_token = null;
let apple_token_expires_at = 0;

function getAppleDeveloperToken() {
    if (apple_developer_token && Date.now() < apple_token_expires_at) return apple_developer_token;
    const expiresInSeconds = 15777000; // ~6 months, Apple's stated max
    apple_developer_token = jwt.sign({ iss: apple_team_id }, apple_private_key, {
        algorithm: 'ES256',
        expiresIn: expiresInSeconds,
        header: { alg: 'ES256', kid: apple_key_id },
    });
    apple_token_expires_at = Date.now() + (expiresInSeconds - 24 * 60 * 60) * 1000;
    return apple_developer_token;
}

let access_token = null;
let refresh_token = null;
const pendingStates = new Set();
const PENDING_STATE_EXPIRY_MS = 10 * 60 * 1000;

const app = express();
app.use(cors({ origin: corsOrigin, credentials: true }));

const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const lobbyLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

app.get('/auth/login', authLimiter, (req, res) => {
    const scope = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state playlist-read-private playlist-read-collaborative';
    const state = generateRandomString(16);
    pendingStates.add(state);
    setTimeout(() => pendingStates.delete(state), PENDING_STATE_EXPIRY_MS);

    const auth_query_parameters = new URLSearchParams({
        response_type: 'code',
        client_id: spotify_client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
    });

    res.redirect('https://accounts.spotify.com/authorize/?' + auth_query_parameters.toString());
});

app.get('/auth/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!state || !pendingStates.has(state)) {
        return res.status(400).send('Authentication failed: invalid state parameter');
    }
    pendingStates.delete(state);

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            }).toString(),
            {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        access_token = response.data.access_token;
        refresh_token = response.data.refresh_token;

        res.redirect(`http://127.0.0.1:${port}/`);
    } catch (error) {
        console.error('Error getting token:', error.response?.data || error.message);
        res.status(500).send('Authentication failed');
    }
});

app.get('/auth/token', (req, res) => {
    if (access_token) {
        res.json({ access_token: access_token });
    } else {
        res.status(401).json({ error: 'No token available' });
    }
});

app.get('/auth/refresh', async (req, res) => {
    if (!refresh_token) {
        return res.status(401).json({ error: 'No refresh token available' });
    }

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            }).toString(),
            {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        access_token = response.data.access_token;
        res.json({ access_token: access_token });
    } catch (error) {
        console.error('Error refreshing token:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

app.get('/auth/logout', (req, res) => {
    access_token = null;
    refresh_token = null;
    res.json({ success: true });
});

// Which providers this server can actually use, so the UI can hide/disable
// ones that aren't configured instead of failing with a misleading error.
app.get('/api/providers', (req, res) => {
    res.json({
        spotify: Boolean(spotify_client_id && spotify_client_secret),
        apple: appleConfigured,
        deezer: true,
        itunes: true,
    });
});

app.get('/auth/apple/developer-token', (req, res) => {
    if (!appleConfigured) {
        return res.status(503).json({ error: 'APPLE_MUSIC_NOT_CONFIGURED' });
    }
    try {
        res.json({ developer_token: getAppleDeveloperToken() });
    } catch (error) {
        console.error('[apple-auth]', error.message);
        res.status(500).json({ error: 'Failed to generate developer token' });
    }
});

// Same-origin proxies so the browser can call catalog APIs that don't send
// CORS headers (used for the free iTunes/Deezer providers and the preview
// fallback).
app.get('/api/itunes/*splat', async (req, res) => {
    try {
        const path = req.params.splat.join('/');
        const response = await axios.get(`https://itunes.apple.com/${path}`, { params: req.query });
        res.json(response.data);
    } catch (error) {
        console.error('iTunes proxy error:', error.message);
        res.status(502).json({ error: 'iTunes request failed' });
    }
});

app.get('/api/deezer/*splat', async (req, res) => {
    try {
        const path = req.params.splat.join('/');
        const response = await axios.get(`https://api.deezer.com/${path}`, { params: req.query });
        res.json(response.data);
    } catch (error) {
        console.error('Deezer proxy error:', error.message);
        res.status(502).json({ error: 'Deezer request failed' });
    }
});

// ── Multiplayer lobby REST endpoints (Socket.IO handles the live parts —
// see lobby.js — these cover screens a player might refresh/revisit) ──────
app.get('/api/lobbies/:id/results', (req, res) => {
    const lobby = db.prepare('SELECT * FROM lobbies WHERE id = ?').get(req.params.id);
    if (!lobby) return res.status(404).json({ error: 'Lobby not found' });
    const players = db
        .prepare('SELECT id, display_name, is_host, score, correct_count FROM lobby_players WHERE lobby_id = ? ORDER BY score DESC')
        .all(lobby.id);
    res.json({
        code: lobby.code,
        provider: lobby.provider,
        status: lobby.status,
        createdAt: lobby.created_at,
        finishedAt: lobby.finished_at,
        players: players.map((p) => ({
            id: p.id,
            displayName: p.display_name,
            isHost: !!p.is_host,
            score: p.score,
            correctCount: p.correct_count,
        })),
    });
});

// Best-effort, no-accounts leaderboard: aggregates by display name across
// finished lobbies. Name collisions aren't disambiguated — that's a known,
// accepted tradeoff of not having a real account system.
app.get('/api/leaderboard', (req, res) => {
    const rows = db
        .prepare(
            `SELECT lp.display_name as displayName, SUM(lp.score) as totalScore, COUNT(DISTINCT lp.lobby_id) as gamesPlayed
             FROM lobby_players lp
             JOIN lobbies l ON l.id = lp.lobby_id
             WHERE l.status = 'finished'
             GROUP BY lp.display_name
             ORDER BY totalScore DESC
             LIMIT 50`
        )
        .all();
    res.json({ leaderboard: rows });
});

async function start() {
    const httpServer = http.createServer(app);
    const io = new SocketIOServer(httpServer, { cors: { origin: corsOrigin, credentials: true } });
    registerLobbyHandlers(io, { getSpotifyToken: () => access_token, getAppleDeveloperToken });

    if (isProduction) {
        app.use(express.static(path.join(__dirname, '../dist')));
        app.get('*splat', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));
    } else {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
        app.use(vite.middlewares);
    }

    httpServer.listen(port, () => {
        console.log(`Guess in a Beat listening at http://127.0.0.1:${port} (${isProduction ? 'production' : 'development'})`);
    });
}

start();
