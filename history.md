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

## Working tree: public website rebuild (2026-10-03)

The game was rebuilt as a free, public, static website.

- **No Spotify, no login, no server.** Spotify's February 2026 development-mode
  limits (five users, a Premium developer account, playlist contents only for
  owned playlists) rule it out for a public game. All music now comes from
  Apple's free 30-second previews through the iTunes Search API, which the
  browser calls directly. The Express server, the OAuth plugin and the `.env`
  requirement are gone.
- **New game modes.** Daily Challenge with streaks, stats and a share grid;
  chart, decade and genre packs (21 packs, about 1,100 songs); Artist mode;
  custom challenges; and seeded "beat my score" links for every game.
- **Sample-accurate audio.** The Web Audio engine decodes previews so even
  0.1 s clips play exactly, skips the preview fade-in, refreshes expired
  preview URLs and drives a live visualizer.
- **Better guessing.** Instant suggestions from the current pack, budgeted
  iTunes search, "close" feedback for the right artist or title, and stricter
  title and artist normalization.
- **Full redesign.** New brand and design system (Bricolage Grotesque, Geist,
  one accent colour, dark and light themes). Album-art home page, mobile tab
  bar, setup, reveal and summary screens, dialogs for help, stats and settings.
- **Release tooling.** TypeScript throughout, Vitest unit tests, a data build
  script with curated seeds, generated icons and social image, a web-app
  manifest, and a GitHub Pages workflow that also refreshes charts daily.

---

## Working tree: playlist import and no more non-music clips (2026-10-04)

- **Import a playlist.** On Create, paste a public Spotify or YouTube playlist
  or album link, tick the songs you want in the list that opens (filter, select
  all, up to the challenge's 25-song limit), and they are found in the iTunes
  catalog and added. New Worker routes: `/api/playlist` (Spotify embed page or
  YouTube Music's web API, no keys) and `/api/match` (iTunes match by title,
  artist and length, edge-cached). `npm run dev` serves both too.
- **Clips no longer play non-music intros.** About 1 in 10 pack songs used a
  music video that is more than 10 seconds longer than the studio track: a
  skit ("Forgot About Dre", +92 s), a film scene ("Filhall", +75 s) or
  dialogue, which played instead of music. The YouTube search now prefers
  YouTube Music's art tracks (the studio audio itself) and, using the track
  length from iTunes (new `Song.duration`), drops uploads more than 8 s longer
  than the track. Pack and Daily data now store each song's length, and
  `build-intros --repick` re-chose the videos. Cached picks (edge and browser)
  were versioned so stale ones aren't reused.

---

## Ideas / possible next steps

- Real-time multiplayer rooms (needs a small backend, e.g. a Durable Object).
- More regional packs (Tamil, Telugu, Arabic, J-pop) and a regional Daily.
- Optional anonymous global leaderboard for the Daily.
- Offline support with a service worker.
