import react from '@vitejs/plugin-react';
import { copyFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { type MatchResult, parseMatchRequest, parsePlaylistUrl } from './src/lib/playlist-protocol.ts';
import { matchTrack } from './worker/catalog.ts';
import { PlaylistError, readPlaylist } from './worker/playlists.ts';

// Static hosts like GitHub Pages serve 404.html for unknown paths. Making it a
// copy of the app lets deep links such as /daily or /play/80s load directly.
function spaFallback(): Plugin {
    let outDir = 'dist';
    return {
        name: 'spa-404-fallback',
        apply: 'build',
        configResolved(config) {
            outDir = path.resolve(config.root, config.build.outDir);
        },
        async closeBundle() {
            await copyFile(path.join(outDir, 'index.html'), path.join(outDir, '404.html'));
        },
    };
}

// Link previews need absolute URLs. SITE_URL is the origin the site is served
// from (e.g. https://name.github.io); without it the image path stays relative.
function socialImage(base: string): Plugin {
    const origin = (process.env.SITE_URL ?? '').replace(/\/$/, '');
    return {
        name: 'social-image',
        transformIndexHtml: (html) => html.replaceAll('__OG_IMAGE__', `${origin}${base}og-image.png`),
    };
}

// In production the Worker answers /api/*; this does the same for `vite dev`
// (without the edge caches, and without multiplayer rooms).
function devApi(base: string): Plugin {
    const send = (res: ServerResponse, status: number, body: unknown) => {
        res.statusCode = status;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(body));
    };
    const readJson = async (req: IncomingMessage): Promise<unknown> => {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    };
    return {
        name: 'dev-api',
        configureServer(server) {
            server.middlewares.use(`${base}api/playlist`, async (req, res) => {
                const ref = parsePlaylistUrl(new URL(req.url ?? '', 'http://localhost').searchParams.get('url') ?? '');
                if (!ref) return send(res, 400, { error: 'Paste a link to a Spotify or YouTube playlist.' });
                try {
                    send(res, 200, await readPlaylist(ref));
                } catch (err) {
                    if (err instanceof PlaylistError) return send(res, 404, { error: err.message });
                    send(res, 502, { error: "Couldn't read that playlist right now. Try again in a moment." });
                }
            });
            server.middlewares.use(`${base}api/match`, async (req, res) => {
                const body = parseMatchRequest(await readJson(req));
                if (req.method !== 'POST' || !body) return send(res, 400, { error: 'tracks are required' });
                const results = await Promise.all(
                    body.tracks.map((t): Promise<MatchResult> =>
                        matchTrack(t, body.country).then(
                            (song) => (song ? { status: 'found', song } : { status: 'missing' }),
                            () => ({ status: 'busy' }),
                        ),
                    ),
                );
                send(res, 200, { results });
            });
        },
    };
}

// Set BASE_PATH=/repo-name/ when hosting under a sub-path (GitHub Pages).
const base = process.env.BASE_PATH || '/';

export default defineConfig({
    base,
    plugins: [react(), spaFallback(), socialImage(base), devApi(base)],
    server: {
        host: '127.0.0.1',
        port: 5173,
    },
    build: {
        target: 'es2022',
    },
    test: {
        include: ['src/**/*.test.ts'],
    },
});
