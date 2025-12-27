# GuessInABeat

Song guessing game - you hear a short clip and try to guess the song. Starts at 0.1 seconds, gets longer if you're wrong.

## Setup

1. `npm install`
2. Create an app at https://developer.spotify.com/dashboard
   - Add `http://127.0.0.1:5000/auth/callback` as redirect URI
3. Copy `.env.example` to `.env` and add your client ID/secret
4. `npm run dev:all`
5. Open http://127.0.0.1:5173

## Notes

- Needs Spotify Premium (free accounts can't control playback)
- Keep Spotify open somewhere for it to work
- If playback fails, play a song in Spotify first then try again
