import { parseMatchRequest, parsePlaylistUrl } from '../src/lib/playlist-protocol';
import { isRoomCode, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '../src/lib/room-protocol';
import { cachedMatch } from './matches';
import { PlaylistError, readPlaylist } from './playlists';
import { cachedVideos } from './videos';

export { Room } from './room';

// Serves the static app plus:
//   GET  /api/yt?artist=&title=&d= YouTube videos for a song's opening (see youtube.ts)
//   GET  /api/playlist?url=        tracks of a public Spotify or YouTube playlist (see playlists.ts)
//   POST /api/match                { country, tracks }: the iTunes song for each track (see catalog.ts)
//   POST /api/rooms               create a multiplayer room, returns { code }
//   GET  /api/rooms/:code         WebSocket into a room (see room.ts)

function json(body: unknown, init: { status?: number; maxAge?: number } = {}): Response {
    return new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: { 'content-type': 'application/json', 'cache-control': init.maxAge ? `public, max-age=${init.maxAge}` : 'no-store' },
    });
}

async function lookup(url: URL, ctx: ExecutionContext): Promise<Response> {
    const artist = url.searchParams.get('artist')?.slice(0, 200).trim();
    const title = url.searchParams.get('title')?.slice(0, 200).trim();
    if (!artist || !title) return json({ error: 'artist and title are required' }, { status: 400 });
    const d = Number(url.searchParams.get('d'));
    const duration = d > 0 && d < 7200 ? Math.round(d) : undefined;
    const ids = await cachedVideos(artist, title, duration, (p) => ctx.waitUntil(p));
    // A failed lookup is usually rate limiting: let the client fall back and retry later.
    return ids ? json({ ids }, { maxAge: 86_400 }) : json({ ids: [] }, { maxAge: 60 });
}

async function playlist(url: URL): Promise<Response> {
    const ref = parsePlaylistUrl(url.searchParams.get('url') ?? '');
    if (!ref) return json({ error: 'Paste a link to a Spotify or YouTube playlist.' }, { status: 400 });
    try {
        return json(await readPlaylist(ref), { maxAge: 600 });
    } catch (err) {
        if (err instanceof PlaylistError) return json({ error: err.message }, { status: 404 });
        return json({ error: "Couldn't read that playlist right now. Try again in a moment." }, { status: 502 });
    }
}

async function match(request: Request, ctx: ExecutionContext): Promise<Response> {
    const req = parseMatchRequest(await request.json().catch(() => null));
    if (!req) return json({ error: 'tracks are required' }, { status: 400 });
    const results = await Promise.all(req.tracks.map((t) => cachedMatch(t, req.country, (p) => ctx.waitUntil(p))));
    return json({ results });
}

function randomCode(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
    return [...bytes].map((b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join('');
}

async function createRoom(env: Env): Promise<Response> {
    for (let i = 0; i < 8; i++) {
        const code = randomCode();
        const room = env.ROOMS.get(env.ROOMS.idFromName(code));
        if (await room.create(code)) return json({ code });
    }
    return json({ error: 'Could not create a room, try again.' }, { status: 503 });
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const { pathname } = url;
        if (pathname === '/api/yt') return lookup(url, ctx);
        if (pathname === '/api/playlist') return playlist(url);
        if (pathname === '/api/match' && request.method === 'POST') return match(request, ctx);
        if (pathname === '/api/rooms' && request.method === 'POST') return createRoom(env);
        const room = pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)$/);
        if (room) {
            const code = room[1].toUpperCase();
            if (!isRoomCode(code)) return json({ error: 'Room not found' }, { status: 404 });
            return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
        }
        if (pathname.startsWith('/api/')) return json({ error: 'Not found' }, { status: 404 });
        return env.ASSETS.fetch(request);
    },
} satisfies ExportedHandler<Env>;
