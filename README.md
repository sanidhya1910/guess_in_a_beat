# Guess in a Beat

A free music quiz for the browser. You hear a split second of a song and try to
name it. Every wrong guess or skip plays a little more. No account, no ads, no
subscription.

- **Daily Challenge**: one song a day, the same for everyone, with streaks,
  stats and a shareable result grid.
- **Packs**: Top 100 charts (US, UK, India), every decade from the 60s to the
  2020s, and genres from rock and hip-hop to Bollywood, K-pop and Latin.
- **Party rooms**: real-time multiplayer. Make a room, share the four-letter
  code, and everyone hears the same clip at the same moment. Name it first for
  bonus points, with live player status, emoji reactions and a podium at the end.
- **Artist mode**: pick any artist and name their biggest songs.
- **Challenges**: build your own list of songs and send friends a link. Every
  finished game also gives you a "beat my score" link with the same songs.
- Three difficulties: Easy (starts at 1s), Normal (0.5s) and In a beat (0.1s).
- Works on phones and desktops, with dark and light themes, keyboard shortcuts
  and an installable web-app manifest.

## How the music is free

Songs play from the 30-second previews Apple publishes for every track in the
iTunes / Apple Music catalog, through the public
[iTunes Search API](https://performance-partners.apple.com/search-api).

- No API key and no login. The browser calls Apple directly, since Apple sends
  CORS headers for both search and audio.
- It works worldwide, including India, where alternatives such as Deezer are
  unavailable.
- Every reveal links to the full song on Apple Music, Spotify and YouTube.

Spotify can't be used for a public game: since February 2026, development-mode
apps are capped at five users and can only read playlists the user owns.

Apple's previews are cut from the middle of a song, though, so guessing
snippets play the song's real opening from YouTube instead, for songs whose
opening has been measured ahead of time. `scripts/build-intros.ts` finds each
pack and Daily song's art track (the upload of the studio recording that
YouTube Music lists as a song) and measures the silence at its top, saved in
`src/data/intros.json`. A hidden YouTube player then plays exactly the first
0.1 s, 0.5 s and so on after that silence, accurate to a few tens of
milliseconds.

Songs without a measurement (custom challenges and playlist imports) play their
snippets from the iTunes preview, since an unmeasured video can open with
seconds of silence. The preview is also used if embedding is disabled or the
browser won't start the player (iOS often blocks it). The
reveal always plays the preview. Preview clips are decoded with the Web Audio
API and start at the first clearly audible moment, not during the fade-in. If
decoding fails, playback falls back to a plain `<audio>` element. Hosts without
the Worker (GitHub Pages, Vercel) always use the preview.

**Skipping non-music intros.** Music videos often open with a skit, a film
scene or dialogue, which made some clips play talking instead of music. Art
tracks never do, so they come first. Every song also carries its length from
iTunes, and any upload more than 8 seconds longer than the studio track is
skipped, since the extra is nearly always a non-music intro. If nothing
suitable is found, the clip plays the iTunes preview instead.

**Skipping silence.** Many uploads open with a beat of silence (sometimes
several seconds), which would make a 0.1 s clip silent. The browser can't
measure a YouTube video's volume, so `npm run data:intros` measures it ahead of
time: for every pack and Daily song it picks the embeddable video, streams its
first 12 seconds through ffmpeg's `silencedetect`, and writes the video id and
where the music starts to `src/data/intros.json`. Clips then start there. The
floor is -60 dB: at -50 dB, soft openings such as the a cappella start of
"Bohemian Rhapsody" were mistaken for silence. It needs a recent `yt-dlp` (YouTube breaks old versions) and `ffmpeg`,
or set `YTDLP` / `FFMPEG` to their paths. Results are cached in
`scripts/.cache/intros.json`; `--retry` re-tries songs that failed, and
`--repick` searches again for songs picked by an older version of the search. Songs
without an entry (Artist mode, custom challenges, new chart entries) still play
from YouTube, starting at 0.

## Importing a playlist

On **Create a challenge**, paste a public Spotify or YouTube (or YouTube Music)
playlist or album link. The tracks open in a list where you tick the songs you
want; each picked track is then found in the iTunes catalog and added.

- `/api/playlist` reads the playlist without any API key: Spotify's embed page
  (which carries the first 100 tracks) or YouTube Music's web API (up to 300
  tracks). Titles of fan uploads ("Artist - Song (Official Video) | Film") are
  cleaned up into a song title and artist.
- `/api/match` finds each picked track on iTunes by title, artist and length,
  8 tracks per request, with answers cached at the edge. Tracks the catalog
  doesn't have are marked "Not found". If iTunes is rate limiting, the rest
  stay ticked so you can try again in a minute.
- Import needs the Worker (or `npm run dev`). Static hosts show a message
  instead.

## Quick start

Requires Node.js 22.18 or newer.

```bash
npm install
npm run dev        # http://127.0.0.1:5173
```

No `.env` is needed. (The old Spotify `.env` can be deleted.)

`npm run dev` runs the front end, the YouTube lookup and playlist import, but not multiplayer
rooms. To try rooms locally, build and run the Worker:
`npm run build && npx wrangler dev` (http://127.0.0.1:8787).

| Script                | What it does                                              |
| --------------------- | --------------------------------------------------------- |
| `npm run dev`         | Dev server with hot reload                                |
| `npm run build`       | Type-check and build the static site into `dist/`         |
| `npm run preview`     | Serve the production build locally                        |
| `npm test`            | Unit tests (guess matching, scoring, daily schedule, ...) |
| `npm run lint`        | ESLint                                                    |
| `npm run data`        | Rebuild all song packs from `scripts/seeds.ts` (slow)     |
| `npm run data:charts` | Refresh only the Top 100 chart packs (fast)               |
| `npm run data:intros` | Measure where each song's music starts on YouTube (slow)  |
| `npm run deploy`      | Build and deploy to Cloudflare Workers                    |
| `npm run brand`       | Re-render the app icons and social image                  |

## Deploying

The build output in `dist/` is a fully static site, so any static host works.

**GitHub Pages (included).** `.github/workflows/deploy.yml` builds and
publishes on every push to `master`. It also runs once a day, which refreshes
the chart packs. To enable it, go to Settings > Pages > Source and choose
"GitHub Actions". The site is served from `/<repo-name>/`. For a custom domain,
add the repository variables `BASE_PATH` (set to `/`) and `SITE_URL` (your
origin, e.g. `https://guessinabeat.com`). `SITE_URL` is used for the social
preview image in link cards.

**Cloudflare Workers (recommended).** This is the only host where everything
works: multiplayer rooms, playlist import and the YouTube openings need the Worker in `worker/`.
`wrangler.jsonc` serves `dist/` as static assets with an SPA fallback, and
binds the `Room` Durable Object (SQLite-backed, available on the free plan). Run `wrangler login` once, then `npm run deploy` (set
`SITE_URL` first for absolute preview-image URLs). The script removes
`_redirects` from the upload, since Workers rejects its catch-all rule.

**Vercel / Netlify / Cloudflare Pages.** Import the repo and use the build
command `npm run build` with output directory `dist`. Set the `SITE_URL`
environment variable to the site's origin. `vercel.json` and
`public/_redirects` already route deep links such as `/daily` to the app.

**Anywhere else.** Serve `dist/` and fall back to `index.html` for unknown
paths. A `404.html` copy is generated for hosts that only support that.

## Multiplayer

Each room is one Durable Object (`worker/room.ts`), addressed by its
four-letter code. Players connect with WebSockets (hibernatable, so idle rooms
cost nothing), and the room runs the game:

1. **Lobby.** The first player in is the host and picks the pack, difficulty
   and number of songs. Anyone can join with the code or the invite link, up to
   12 players.
2. **Rounds.** A 3.5 s countdown, then clip 1 plays for everyone. Each clip
   step lasts its length plus 7 s to guess. A wrong guess or a pass sits you out
   until the next, longer clip; when everyone still guessing is sitting out, the
   next clip starts early. When everyone has named it, the song is revealed.
3. **Scoring.** The usual points for the clip you named it on (times the
   difficulty multiplier), plus +30, +20 and +10 for the first three to name it.
4. **Reveal** for 10 s (the host can skip ahead), then the next song, and a
   podium with a song-by-song recap at the end.

The host's browser picks the songs and sends them to the room. Clients only
ever get the audio URLs, never the title or artist, until the reveal, and
guesses are judged on the server (`src/lib/match.ts` is shared). If the host
leaves, the next connected player takes over. A dropped player who comes back
(same browser) keeps their score. Rooms delete themselves 30 minutes after the
last player leaves. Message types live in `src/lib/room-protocol.ts`.

## Song data

Song lists are built ahead of time and shipped as static JSON, so starting a
game costs no API calls.

- `scripts/seeds.ts` holds the curated packs as `Artist | Title` lines, the
  chart storefronts and the one-tap artists.
- `npm run data` matches every line to an iTunes track. It prefers the original
  studio recording over remixes, live cuts, covers and karaoke. It writes
  `src/data/packs/*.json`, `catalog.json`, `artists.json` and `daily.json`.
  iTunes allows about 20 requests a minute, so a full run from scratch takes
  around 45 minutes. Results are cached in `scripts/.cache`, so later runs only
  fetch new or changed lines.
- `daily.json` is the Daily Challenge schedule. It is **append-only**: new songs
  are added to the end, so a given date always maps to the same song. Puzzle #1
  is the date in `DAILY_EPOCH` (`src/lib/daily.ts`).
- If a stored preview link stops working, the game fetches a fresh one from
  iTunes. If that fails too, it swaps in a spare song.

`npm run brand` regenerates the PNG icons and the social share image in
`public/`. It renders them with a local Chrome or Edge.

## Project layout

```
src/
  app/          App shell, routes, header / tab bar / footer, UI context
  pages/        Home, Daily, Packs, Pack, Artists, Artist, Create, Custom, Party, Room, About
  game/         Game screen, reducer, timeline, play button, guess search, reveal, summary
  room/         Multiplayer lobby, in-game room, results, player list, reactions
  components/   Dialogs (help, stats, settings), cover grids, pack cards
  lib/          Audio engine, YouTube player, iTunes client, guess matching, scoring,
                daily schedule, room protocol and client, persisted stores, router, sharing
  data/         Generated song data (see above)
  styles/       Design tokens and CSS
scripts/        Data build, intro measurement, curated seeds, brand-asset renderer
worker/         Cloudflare Worker: static assets, playlist import
                (/api/playlist, /api/match), multiplayer rooms
```

## Privacy

There are no accounts, cookies or analytics. Settings, streaks and scores live
in the player's browser (`localStorage`). Song searches and audio come straight
from Apple's servers, and opening clips from YouTube's embedded player. An
imported playlist link is sent to the site's server, which reads the playlist
from Spotify or YouTube and doesn't store it. In a
multiplayer room, the name you pick and your score are held by the room until
it closes, and shown to the other players.

## Credits

Song previews and artwork courtesy of Apple Music. This is an independent fan
project, not affiliated with or endorsed by Apple, Spotify, or any artist or
label.
