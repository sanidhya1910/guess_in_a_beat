import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import axios from 'axios'

const SCOPE = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state playlist-read-private playlist-read-collaborative'
const REDIRECT_URI = 'http://127.0.0.1:5173/auth/callback'

// Runs the Spotify OAuth flow inside Vite's dev server, so `npm run dev` alone
// serves both the app and the /auth/* endpoints — no separate process.
function spotifyAuth(env: Record<string, string>): Plugin {
  const clientId = env.SPOTIFY_CLIENT_ID
  const clientSecret = env.SPOTIFY_CLIENT_SECRET
  const basicAuth = () => 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  let accessToken: string | null = null
  let refreshToken: string | null = null
  const pendingStates = new Set<string>()

  return {
    name: 'spotify-auth',
    configureServer(server) {
      if (!clientId || !clientSecret) {
        server.config.logger.warn(
          '\n[spotify-auth] SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET missing from .env — login will fail.\n'
        )
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/auth/')) return next()
        const url = new URL(req.url, 'http://127.0.0.1:5173')
        const json = (code: number, body: unknown) => {
          res.statusCode = code
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }
        const redirect = (location: string) => {
          res.statusCode = 302
          res.setHeader('Location', location)
          res.end()
        }

        try {
          switch (url.pathname) {
            case '/auth/login': {
              const state = Math.random().toString(36).slice(2) + Date.now().toString(36)
              pendingStates.add(state)
              setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000)
              const params = new URLSearchParams({
                response_type: 'code',
                client_id: clientId,
                scope: SCOPE,
                redirect_uri: REDIRECT_URI,
                state,
              })
              return redirect('https://accounts.spotify.com/authorize/?' + params.toString())
            }
            case '/auth/callback': {
              const code = url.searchParams.get('code')
              const state = url.searchParams.get('state')
              if (!state || !pendingStates.has(state)) {
                res.statusCode = 400
                return res.end('Authentication failed: invalid state parameter')
              }
              pendingStates.delete(state)
              const resp = await axios.post(
                'https://accounts.spotify.com/api/token',
                new URLSearchParams({ code: code!, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' }).toString(),
                { headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' } }
              )
              accessToken = resp.data.access_token
              refreshToken = resp.data.refresh_token
              return redirect('/')
            }
            case '/auth/token':
              return accessToken ? json(200, { access_token: accessToken }) : json(401, { error: 'No token available' })
            case '/auth/refresh': {
              if (!refreshToken) return json(401, { error: 'No refresh token available' })
              const resp = await axios.post(
                'https://accounts.spotify.com/api/token',
                new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
                { headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' } }
              )
              accessToken = resp.data.access_token
              return json(200, { access_token: accessToken })
            }
            case '/auth/logout':
              accessToken = null
              refreshToken = null
              return json(200, { success: true })
            default:
              return next()
          }
        } catch (err) {
          const e = err as { response?: { data?: unknown }; message?: string }
          console.error('[spotify-auth]', e.response?.data || e.message)
          if (url.pathname === '/auth/callback') {
            res.statusCode = 500
            return res.end('Authentication failed')
          }
          return json(500, { error: 'Authentication error' })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), spotifyAuth(env)],
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        // Proxy the iTunes Search API to sidestep CORS (used for preview fallback).
        '/api/itunes': {
          target: 'https://itunes.apple.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/itunes/, ''),
        },
      },
    },
  }
})
