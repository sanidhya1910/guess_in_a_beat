# GuessInABeat

Song guessing game - you hear a short clip and try to guess the song. Starts at 0.1 seconds, gets longer if you're wrong.

## Setup

1. `npm install`
2. Create an app at https://developer.spotify.com/dashboard
   - Add `http://127.0.0.1:5173/auth/callback` as a redirect URI
3. Copy `.env.example` to `.env` and add your client ID/secret
4. `npm run dev`
5. Open http://127.0.0.1:5173

That's it — one command. The Spotify login runs inside the Vite dev server, so
there's no separate backend to start.

## Notes

- **No Premium required.** Snippets play in the browser from Spotify's 30-second
  previews; any track without a Spotify preview falls back to an iTunes preview
  automatically.
- Login state is held in memory, so restarting the dev server logs you out.
- `npm run server` / `npm run dev:all` still run the standalone Express server
  (port 5000) if you prefer that setup or are building for production.
