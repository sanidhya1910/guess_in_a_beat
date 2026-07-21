# Development History

A chronological record of how *Guess in a Beat* has evolved. Dates and hashes
come from the git log; the final section covers work currently staged in the
working tree but not yet committed.

---

## `53e4dd9` — Initial commit (2025-12-27)

The first working version of the game.

- **Scaffold** — Vite + React 19 client with TypeScript config, ESLint, and the
  standard project layout.
- **Auth server** (`server/index.js`) — Express service implementing the
  Spotify OAuth authorization-code flow: `/auth/login`, `/auth/callback`,
  `/auth/token`, `/auth/refresh`, `/auth/logout`, with in-memory token storage.
- **Spotify client** (`src/services/spotify.js`) — token handling plus playlist
  fetch, track search, and device-aware play/pause against the Web API.
- **Core game** — `App.jsx` (login → setup → game flow), `Login.jsx`,
  `Setup.jsx` (single playlist input), `Game.jsx` (6-attempt loop with the
  0.1→10s snippet ladder and 6→1 point scale), and `SongInput.jsx` search box.
- **Styling** — first pass of `App.css` (~430 lines).
- **Docs** — README with setup steps and Premium/playback notes.

---

## `a36b1af` — UI, playback, search, multi-playlist (2025-12-27)

A substantial second pass touching five files (+642 / −288).

- **UI overhaul** — `App.css` roughly doubled (+560 lines) with a broad
  restyling of the game and setup screens.
- **Improved playback** — reworked snippet playback and the preview /
  Spotify-Connect handling in `Game.jsx` (+256 lines of net change).
- **Better search** — `SongInput.jsx` refined; duplicate results removed.
- **Multiple playlists** — `Setup.jsx` extended to accept and merge more than
  one playlist at once.
- **Server tweaks** — minor changes to `server/index.js`.

---

## Working tree — full UI redesign (uncommitted)

A large redesign is currently staged in the working tree (~+1843 / −916 across
10 files), plus a new `src/components/Icons.jsx`. Highlights:

- **Design-token system** — `App.css` reorganized around a `:root` palette
  (indigo-black surfaces, electric-green accent, semantic red), shared radii,
  and motion/easing tokens. Two web fonts added in `index.html`:
  **Barlow Condensed** (display) and **Inter** (body).
- **Reimagined game view** — DAW-style attempt rows with left state strips, a
  segmented timeline with an animated fill and a moving snippet-length cursor, a
  large circular play button with an equalizer animation, a polished track
  reveal, a "Now Playing" indicator, and a final stats card (points / correct /
  accuracy).
- **New icon set** — `Icons.jsx` centralizes inline SVGs (play, skip, arrows,
  check/x, music, trophy, search, Spotify, chevron), replacing ad-hoc markup.
- **Smarter guess matching** — `Game.jsx` normalizes titles (strips
  `Remastered`/`Deluxe`/`Live`/`feat.`/year tags, unifies smart quotes) and
  accepts a match on normalized title + overlapping artist, not just track id.
- **Keyboard shortcuts** — `Space` to play the snippet, `Enter` to advance.
- **Setup upgrades** — accepts playlist URLs, `spotify:` short links, or raw
  ids; multi-line input; per-playlist error reporting; de-dupe, shuffle, and an
  optional song limit.
- **Search box** — accessible listbox semantics, arrow-key navigation,
  click-outside dismissal, debounced queries.
- **Accessibility & motion** — ARIA roles/labels, focus-visible outlines, a
  `max-width: 600px` responsive breakpoint, and a `prefers-reduced-motion`
  override.
- **Verified** — `npm run lint` and `npm run build` both pass cleanly.

---

## Working tree — one-command login & iTunes preview fallback (uncommitted)

Reworked auth and playback to remove the two biggest sources of friction (a
separate server that had to be running, and the Spotify Premium requirement)
while keeping the Spotify login.

- **One-command dev** — the Spotify OAuth flow was moved out of the standalone
  Express server and into a Vite plugin (`spotifyAuth` in `vite.config.ts`), so
  `npm run dev` alone serves both the app and the `/auth/*` endpoints on
  `:5173`. This fixes the "site can't be reached" failure that happened when the
  port-5000 server wasn't started. The OAuth redirect URI is now
  `http://127.0.0.1:5173/auth/callback` (must be registered in the Spotify
  dashboard). `server/index.js` still provides the same flow for production.
- **iTunes preview fallback** — playback no longer uses the Spotify Connect /
  Premium path. `Game.jsx` resolves a preview per track: Spotify's `preview_url`
  when present, otherwise a 30-second preview from the **iTunes Search API**
  (`services/music.js`), matched by title + artist and cached per track. Since
  snippets are at most 10s, previews are always enough — **no Premium or open
  Spotify client needed**. iTunes is reached via a `/api/itunes` proxy (Vite in
  dev, Express in prod) to sidestep CORS.
- **Loud server-down error** — `spotify.js` distinguishes an unreachable auth
  server (no HTTP response) from a normal 401, and `Login.jsx` shows a clear
  "start the app with `npm run dev`" banner instead of a dead redirect.
- **Docs** — README, `summary.md`, and this file updated. Lint and build pass.

---

## Ideas / possible next steps

- Persist tokens (and support multiple users) instead of in-memory storage.
- Optional round settings (attempt count, snippet ladder, categories).
- Local high-score / streak history.
- Graceful UI when a track has neither a preview nor an available device.
