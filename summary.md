# Guess in a Beat — Project Summary

A browser music-guessing game in the spirit of *Heardle*. The player hears an
increasingly long snippet of a song and tries to name it. The clip starts at
**0.1 seconds** and grows across six attempts — the sooner you guess, the more
points you earn. Songs are pulled from any public Spotify playlist(s) or track
links you paste in.

---

## How the game works

1. **Log in with Spotify** — OAuth authorization-code flow, served by the Vite
   dev server itself (no separate backend to run).
2. **Set up a round** — paste one or more Spotify **playlist** or **track**
   links (one per line). Playlists are fetched with full pagination, merged,
   de-duplicated by track id, and shuffled. An optional *song limit* caps how
   many tracks enter the round.
3. **Guess** — for each track you get up to 6 attempts. Snippet lengths and the
   points on offer decrease as you use more attempts:

   | Attempt | 1 | 2 | 3 | 4 | 5 | 6 |
   |---------|---|---|---|---|---|---|
   | Snippet | 0.1s | 0.5s | 1s | 2s | 5s | 10s |
   | Points  | 6 | 5 | 4 | 3 | 2 | 1 |

   Type into the search box to query Spotify's catalog (debounced, keyboard
   navigable). Selecting a result submits it as a guess. You can also **Skip**
   an attempt.
4. **Reveal & continue** — on a correct guess or after the sixth miss, the track
   is revealed (album art + full playback) and you advance to the next song.
5. **Final card** — after the last track, a summary shows total points, songs
   correct, and accuracy.

### Guess matching
A guess counts as correct if the track id matches, **or** if the normalized
title matches and at least one artist overlaps. Normalization strips common
suffixes/parentheticals (`Remastered`, `Deluxe`, `Live`, `feat.`, year tags,
etc.) and unifies smart quotes, so "Song - 2011 Remaster" matches "Song".

---

## Playback strategy

All audio plays in the browser via an `Audio` element — **no Spotify Premium
and no open Spotify client required**. For each track the game resolves a
30-second preview URL:

- **Spotify preview** — used directly if the track has a `preview_url`.
- **iTunes fallback** — if it doesn't (increasingly common, since Spotify has
  been dropping `preview_url` from API responses), the game looks the track up
  on the iTunes Search API by title + artist and plays that 30-second preview
  instead. Resolved URLs are cached per track. See `services/music.js`.

Because the game only ever plays snippets up to 10 seconds, a 30-second preview
is always sufficient. Snippet length is enforced with a timer that pauses the
audio when the window elapses; a `requestAnimationFrame` loop animates the
timeline fill. On reveal, the track plays continuously ("Now Playing").

---

## Architecture

```
┌───────────────────────────────────────┐   HTTPS   ┌────────────────┐
│  Vite dev server (:5173)               │ ────────► │  Spotify APIs  │
│  ├─ React client                       │           │ accounts + Web │
│  ├─ spotify-auth plugin  (/auth/*)     │           └────────────────┘
│  └─ iTunes proxy         (/api/itunes) │ ────────► iTunes Search API
└───────────────────────────────────────┘
        │
        └──────────  direct Spotify Web API calls (Bearer token)
```

- The **Spotify OAuth flow lives inside the Vite dev server** as a small plugin
  (`spotifyAuth` in `vite.config.ts`), so `npm run dev` serves the app and the
  `/auth/*` endpoints from one process on one port. It exposes `/auth/login`,
  `/auth/callback`, `/auth/token`, `/auth/refresh`, and `/auth/logout`, holds
  tokens in memory (single-user / local-dev model), and validates a random
  `state` to guard against CSRF. The OAuth redirect URI is
  `http://127.0.0.1:5173/auth/callback`.
- The **iTunes Search API** has no CORS header, so it's reached through a
  same-origin proxy at `/api/itunes/*` (Vite's proxy in dev; the Express server
  in production).
- The **client** obtains the access token from `/auth/token`, then calls the
  Spotify Web API directly for playlists and track search. A request wrapper
  auto-refreshes the token once on a `401`.
- The standalone **Express server** (`server/index.js`) still implements the
  same OAuth flow and iTunes proxy for production / `npm run dev:all`, but is
  not needed for the default `npm run dev` workflow.

### Tech stack
- **React 19** + **Vite 7** (client + folded-in auth)
- **Express 5** + **axios** (optional standalone server for production)
- **iTunes Search API** for preview fallback (no key, no auth)
- Plain CSS with a design-token system (no UI framework)
- **TypeScript** config present; app components are `.jsx`, entry is `.tsx`

---

## Project structure

```
guess_in_a_beat/
├── index.html                 # Vite entry; loads Barlow Condensed + Inter
├── vite.config.ts             # Vite + spotify-auth plugin + iTunes proxy
├── server/
│   └── index.js               # Standalone Express server (OAuth + iTunes proxy)
├── src/
│   ├── main.tsx               # React root
│   ├── App.jsx                # Top-level state machine: login → setup → game
│   ├── App.css                # Full design system + all component styles
│   ├── index.css              # Reset + base sizing
│   ├── components/
│   │   ├── Login.jsx           # Spotify login screen (+ server-down warning)
│   │   ├── Setup.jsx           # Playlist/track input, shuffle, song limit
│   │   ├── Game.jsx            # Core game loop, playback, scoring, timeline
│   │   ├── SongInput.jsx       # Debounced search-as-you-type guess box
│   │   └── Icons.jsx           # Inline SVG icon set
│   └── services/
│       ├── spotify.js          # Spotify Web API client (auth, playlists, search)
│       └── music.js            # iTunes preview lookup (playback fallback)
└── README.md
```

### Component responsibilities
- **`App.jsx`** — holds `token`, loaded `tracks`, and `gameStarted`; switches
  between the Login, Setup, and Game views, handles logout, and flags an
  unreachable auth server.
- **`Setup.jsx`** — parses playlist/track links (accepts full URLs, `spotify:`
  short links, or raw 22-char ids), fetches and merges tracks, de-dupes,
  shuffles, and applies the optional limit.
- **`Game.jsx`** — the heart of the app: attempt state, snippet playback
  (Spotify preview or iTunes fallback, resolved and cached per track), progress
  animation, guess/skip handling, scoring, the reveal, and the final stats card.
  Includes `Space` (play) and `Enter` (next song) shortcuts.
- **`SongInput.jsx`** — 300 ms-debounced Spotify search with an accessible,
  arrow-key-navigable results dropdown.
- **`spotify.js`** — token get/refresh/logout, paginated playlist fetch,
  batched track fetch, and search. Surfaces an `AUTH_SERVER_UNREACHABLE` error
  when the auth endpoint can't be reached.
- **`music.js`** — `findPreviewUrl(name, artist)` against the iTunes Search API,
  used when a Spotify track has no preview.

---

## UI / design system

The interface is a self-contained dark theme defined entirely in `App.css`:

- **Tokens** — a `:root` palette (indigo-black backgrounds, electric-green
  accent, semantic red), radii, easing/motion timings, and two font families
  (`Barlow Condensed` for display, `Inter` for body).
- **Screens** — a hero login, a focused setup card, and a game view built from
  **DAW-style attempt rows**, a **segmented timeline** with an animated fill and
  a moving cursor, a large circular **play button** with an equalizer animation,
  the **guess row**, and the **reveal / final** cards.
- **Polish** — entrance animations, `pulse-glow` / equalizer effects, custom
  scrollbars, a `max-width: 600px` responsive breakpoint, and a
  `prefers-reduced-motion` override that neutralizes animation.

---

## Running locally

```bash
npm install
# create .env from .env.example with SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET
npm run dev          # serves the app AND the /auth endpoints on :5173
```

Then open <http://127.0.0.1:5173>. In the Spotify developer dashboard, register
`http://127.0.0.1:5173/auth/callback` as a redirect URI.

**Scripts:** `dev` (app + auth, the normal path) · `server` (standalone Express
server) · `dev:all` (Express + Vite) · `build` (`tsc -b && vite build`) · `lint`
· `preview`.

---

## Notes & limitations

- Tokens live in memory, so the setup is **single-user / local-dev**; restarting
  the dev server logs you out.
- **No Spotify Premium required** — playback uses 30-second previews only, with
  an automatic iTunes fallback when a Spotify preview is missing. If neither
  source has a preview, that track simply can't be played (rare).
- iTunes previews are matched by title + artist, so an obscure track could in
  principle resolve to a different recording; mainstream catalogs match well.
