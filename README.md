# GuessInABeat

Song guessing game — you hear a short clip and try to guess the song. Starts at 0.1 seconds, gets longer if you're wrong. Play solo or create a party with friends (2–4 players) and compete live with a shared leaderboard.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env`.
3. Set up whichever music providers you want (see below) — **Spotify is required** for the server to boot; the others are optional.
4. `npm run dev`
5. Open http://127.0.0.1:5173

That's it — one command runs everything: the app, auth, provider proxies, and the multiplayer server (Socket.IO + SQLite) all live in a single Node process (`server/index.js`).

## Music providers

| Provider | Login required? | Cost | Notes |
|---|---|---|---|
| **Spotify** | Yes (OAuth) | Free developer account | Full playback needs Premium; previews work without it |
| **Apple Music** | No | Paid Apple Developer Program ($99/yr) | Public catalog links only |
| **Deezer** | No | Free | Public catalog links only |
| **iTunes** | No | Free | Search-and-add — no playlist links, just search for songs and add them |

### Spotify (required)

1. Create an app at https://developer.spotify.com/dashboard
   - Add `http://127.0.0.1:5173/auth/callback` as a redirect URI
2. Add `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` to `.env`

### Apple Music (optional)

Apple Music catalog reads (search, public playlists, public songs) only need an app-wide developer token — no per-user login, no MusicKit popup. But minting that token requires a **paid** Apple Developer Program membership:

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/yr)
2. Create a MusicKit key at [Certificates, Identifiers & Profiles → Keys](https://developer.apple.com/account/resources/authkeys/list)
3. Add to `.env`:
   - `APPLE_TEAM_ID` — your Team ID
   - `APPLE_KEY_ID` — the key's ID
   - `APPLE_PRIVATE_KEY` — the `.p8` file's contents, with real newlines replaced by `\n` (see `.env.example` for the format)

If these aren't set, the server logs a warning at startup and the Apple Music option simply won't work — everything else is unaffected.

### Deezer & iTunes (no setup needed)

Both are free, public, no-login catalogs — nothing to configure. Song previews come straight from their own catalog data.

## Playing with friends

From the landing page, choose **Play with Friends** to create or join a party:

- **Create a Party** — pick a music source, a party size (2–4 players), and a playlist/search lineup just like solo play. You'll get a 6-character code and a shareable `/join/<code>` link.
- **Join a Party** — enter the code (or open the shared link, which pre-fills it) and your name.
- Once everyone's in, the host starts the game. Everyone gets the same track sequence; live scores update in real time as people guess.
- When the game ends, final scores are saved and shown on a results screen — a best-effort all-time leaderboard (`/api/leaderboard`) aggregates scores by display name across finished parties. There are no accounts, so name collisions aren't disambiguated — that's a known tradeoff of keeping this simple.

## Notes

- **Instant previews, no subscriptions required to play.** Snippets play right in the browser from each provider's own 30-second previews; tracks without one fall back to an iTunes preview automatically.
- Spotify login state is held in server memory, so restarting the server logs you out. Multiplayer lobby/score data persists in a local SQLite file (`data/lobbies.db`), which survives restarts.
- `npm run build && npm start` builds and serves a production bundle from the same consolidated server (set `CORS_ORIGIN` in `.env` if you're hosting behind a real domain instead of localhost).
