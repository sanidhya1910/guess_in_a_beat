import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'lobbies.db'));
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS lobbies (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        code          TEXT NOT NULL UNIQUE,
        host_name     TEXT NOT NULL,
        provider      TEXT NOT NULL,
        source_input  TEXT,
        track_ids     TEXT NOT NULL,
        max_players   INTEGER NOT NULL DEFAULT 4,
        status        TEXT NOT NULL DEFAULT 'waiting',
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        started_at    TEXT,
        finished_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS lobby_players (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        lobby_id      INTEGER NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
        display_name  TEXT NOT NULL,
        socket_id     TEXT,
        is_host       INTEGER NOT NULL DEFAULT 0,
        score         INTEGER NOT NULL DEFAULT 0,
        correct_count INTEGER NOT NULL DEFAULT 0,
        joined_at     TEXT NOT NULL DEFAULT (datetime('now')),
        left_at       TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_lobbies_code ON lobbies(code);
    CREATE INDEX IF NOT EXISTS idx_lobby_players_lobby ON lobby_players(lobby_id);
`);
