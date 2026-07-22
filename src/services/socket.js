import { io } from 'socket.io-client';

// Single shared socket for the whole app (same origin — server/index.js
// serves both the SPA and Socket.IO on one port). Connected lazily, only
// once the user actually enters a multiplayer flow.
const socket = io({ autoConnect: false });

const STORAGE_KEY = 'gib_lobby_session';

export const getStoredSession = () => {
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    } catch {
        return null;
    }
};

export const storeSession = (code, playerId) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ code, playerId }));
};

export const clearSession = () => sessionStorage.removeItem(STORAGE_KEY);

// On any (re)connect — including automatic reconnects after a dropped wifi
// connection — silently try to re-associate with whatever lobby session is
// stored, so a flaky connection doesn't visibly kick someone from a game.
socket.on('connect', () => {
    const session = getStoredSession();
    if (session) socket.emit('rejoin_lobby', session, () => {});
});

export const connectSocket = () => {
    if (!socket.connected) socket.connect();
    return socket;
};

export const getSocket = () => socket;

export const emitAck = (event, payload) =>
    new Promise((resolve, reject) => {
        socket.emit(event, payload, (res) => {
            if (res?.error) reject(new Error(res.error));
            else resolve(res);
        });
    });
