# Guess in a Beat — Project Summary

A browser music-guessing game in the spirit of *Heardle*. The player hears an
increasingly long snippet of a song and tries to name it. The clip starts at
**0.1 seconds** and grows across six attempts — the sooner you guess, the more
points you earn. Songs are pulled from any public Spotify playlist(s) or track
links you paste in.

---

## How the game works

1. **Log in with Spotify** — OAuth authorization-code flow, handled by a small
   Express backend.
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

The game plays audio through two paths, chosen per track:

- **30-second preview** — if the track has a `preview_url`, it streams directly
  in the browser via an `Audio` element. Works without Spotify Premium.
- **Spotify Connect fallback** — if there's no preview, playback is driven
  through the Spotify Web API against the user's active device (found via the
  devices endpoint, transferring playback if none is active). This path
  requires **Spotify Premium** and an open Spotify client somewhere.

Snippet length is enforced with a timer that pauses the audio / Spotify
playback when the window elapses; a `requestAnimationFrame` loop animates the
timeline fill. On reveal, the track plays continuously ("Now Playing").

---

## Architecture

```
┌─────────────────┐        ┌──────────────────────┐        ┌────────────────┐
│  React client   │  HTTP  │  Express auth server  │  HTTPS │  Spotify APIs  │
│  (Vite, :5173)  │ ─────► │       (:5000)         │ ─────► │ accounts + Web │
└─────────────────┘        └──────────────────────┘        └────────────────┘
        │                                                          ▲
        └──────────────  direct Web API calls (Bearer token)  ────┘
```

- The **Express server** (`server/index.js`) owns the OAuth secret and the
  token lifecycle. It exposes `/auth/login`, `/auth/callback`, `/auth/token`,
  `/auth/refresh`, and `/auth/logout`. Tokens are held in server memory (single
  user / local-dev model), and the login flow validates a random `state` to
  guard against CSRF.
- The **client** obtains the access token from the server, then calls the
  Spotify Web API directly for playlists, track search, and playback. A request
  wrapper auto-refreshes the token once on a `401`.

### Tech stack
- **React 19** + **Vite 7** (client)
- **Express 5** + **axios** (auth/token server)
- Plain CSS with a design-token system (no UI framework)
- **TypeScript** config present; app components are `.jsx`, entry is `.tsx`

---

## Project structure

```
guess_in_a_beat/
├── index.html                 # Vite entry; loads Barlow Condensed + Inter
├── server/
│   └── index.js               # Express OAuth + token server (port 5000)
├── src/
│   ├── main.tsx               # React root
│   ├── App.jsx                # Top-level state machine: login → setup → game
│   ├── App.css                # Full design system + all component styles
│   ├── index.css              # Reset + base sizing
│   ├── components/
│   │   ├── Login.jsx           # Spotify login screen
│   │   ├── Setup.jsx           # Playlist/track input, shuffle, song limit
│   │   ├── Game.jsx            # Core game loop, playback, scoring, timeline
│   │   ├── SongInput.jsx       # Debounced search-as-you-type guess box
│   │   └── Icons.jsx           # Inline SVG icon set
│   └── services/
│       └── spotify.js          # Web API client (auth, playlists, search, play)
└── README.md
```

### Component responsibilities
- **`App.jsx`** — holds `token`, loaded `tracks`, and `gameStarted`; switches
  between the Login, Setup, and Game views and handles logout.
- **`Setup.jsx`** — parses playlist/track links (accepts full URLs, `spotify:`
  short links, or raw 22-char ids), fetches and merges tracks, de-dupes,
  shuffles, and applies the optional limit.
- **`Game.jsx`** — the heart of the app: attempt state, snippet playback (both
  paths), progress animation, guess/skip handling, scoring, the reveal, and the
  final stats card. Includes `Space` (play) and `Enter` (next song) shortcuts.
- **`SongInput.jsx`** — 300 ms-debounced Spotify search with an accessible,
  arrow-key-navigable results dropdown.
- **`spotify.js`** — token get/refresh/logout, paginated playlist fetch,
  batched track fetch, search, and device-aware play/pause.

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
npm run dev:all      # runs the Express server (:5000) and Vite (:5173) together
```

Then open <http://127.0.0.1:5173>. In the Spotify developer dashboard, register
`http://127.0.0.1:5000/auth/callback` as a redirect URI.

**Scripts:** `dev` (client only) · `server` (auth server only) · `dev:all`
(both) · `build` (`tsc -b && vite build`) · `lint` · `preview`.

---

## Notes & limitations

- Tokens live in server memory, so the setup is **single-user / local-dev**;
  restarting the server logs you out.
- Full playback (non-preview tracks) needs **Spotify Premium** and an open
  Spotify client. If playback fails with `NO_DEVICES`, start a song in Spotify
  once and retry.
- Preview availability varies by market and track, which is why the Spotify
  Connect fallback exists.
