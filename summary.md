# Name That Beat: Technical Summary

A static, client-only music quiz in the spirit of *Heardle*. The player hears an
increasingly long clip of a song and tries to name it. There is no backend, no
login and no API key. See `README.md` for setup and deployment.

---

## Game rules

Each song allows up to six attempts. A wrong guess or a skip unlocks the next,
longer clip.

| Difficulty | Clip ladder (seconds)  | Points multiplier |
| ---------- | ---------------------- | ----------------- |
| Easy       | 1, 2, 4, 7, 11, 16     | 1x                |
| Normal     | 0.5, 1, 2, 4, 8, 15    | 1.5x              |
| In a beat  | 0.1, 0.5, 1, 2, 5, 10  | 2x                |

Base points by attempt are 100, 80, 60, 40, 20 and 10. The Daily always uses
Normal so results are comparable.

**Guess judging** (`src/lib/match.ts`). A guess is *correct* when it is the same
track, or the same normalized title by an overlapping artist. Normalization
strips brackets, "feat." credits, remaster, live and version suffixes,
diacritics and punctuation, so remasters, live cuts and featured versions all
count. A guess is *close* (amber) when only the artist or only the title
matches.

## Modes

| Route           | Mode                                                               |
| --------------- | ------------------------------------------------------------------ |
| `/daily`        | Picks a Daily category: one song per category per local calendar day from `daily.json` |
| `/daily/:category` | That category's song for today; progress and stats persist per category |
| `/play/:pack`   | 5 to 20 songs from a chart, decade or genre pack                   |
| `/artist/:id`   | An artist's most popular songs, fetched live from iTunes           |
| `/create`, `/c` | Build a list of songs (search, or import a Spotify/YouTube playlist and tick songs); the link encodes the track ids |

Any finished game produces a challenge link containing `seed`, difficulty,
song count and score. Because the shuffle is seeded (`src/lib/rng.ts`), a friend
who opens the link plays the same songs in the same order.

## Music source and playback

- **Catalog**: iTunes Search API (`src/lib/itunes.ts`), called directly from the
  browser (Apple sends CORS headers). A client-side budget keeps searches under
  Apple's limit of about 20 requests per minute. Results are cached, and stale
  searches are aborted. When the budget is used up, suggestions fall back to the
  songs in the current game.
- **Audio** (`src/lib/audio.ts`): the 30-second preview is fetched and decoded
  into an `AudioBuffer`, then played with sample-accurate start and stop and a
  short fade to avoid clicks. Snippets start at the first audible 50 ms window
  so 0.1 s clips are never silent. An analyser node drives the radial
  visualizer. If decoding fails, playback falls back to an `<audio>` element. If
  a preview URL has expired, it is refreshed with an id lookup.
- **Song openings**: guessing clips play the song's start from YouTube for
  songs measured in `src/data/intros.json` (packs and the Daily), starting
  after the video's leading silence. The picks prefer YouTube Music art tracks
  (the studio audio) and drop uploads more than 8 s longer than the iTunes
  track length. Unmeasured songs (custom challenges, playlist imports) play
  from the silence-trimmed iTunes preview instead.
- **Playlist import** (`worker/playlists.ts`, `worker/catalog.ts`): the Worker
  reads public Spotify / YouTube playlists without keys and matches picked
  tracks to iTunes by title, artist and length.
- **Static data** (`scripts/build-data.ts`): curated seeds and Apple's
  most-played charts are resolved at build time into JSON packs. Each pack loads
  on demand as its own chunk.

## Front end

- React 19 + TypeScript + Vite 7. No UI framework; plain CSS with design tokens
  in `src/styles/tokens.css` (dark default, light via OS or Settings).
- Fonts are self-hosted through Fontsource: Bricolage Grotesque (display),
  Geist (body) and Geist Mono (numbers). Icons are Phosphor, and Motion handles
  the reveal and summary animations.
- A minimal history-API router (`src/lib/router.ts`) works under a sub-path
  base for GitHub Pages.
- State: a game reducer (`src/game/reducer.ts`), plus small persisted stores
  (`src/lib/store.ts`) for settings, Daily history and best scores. These sync
  across tabs and survive blocked storage.
- Accessibility: native `<dialog>` modals, combobox and listbox semantics for
  search, radio-group segmented controls, visible focus, reduced-motion support
  and live regions for toasts and reveals.

## Testing

`npm test` runs Vitest unit tests for normalization and judging, seeded
shuffles, daily indexing across DST, streak statistics, scoring, the game
reducer and share text. The build runs `tsc -b`, and `npm run lint` must pass.
