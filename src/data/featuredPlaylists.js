// Curated, ready-to-play playlists shown on the solo entry screen so people can
// jump straight in without any login. All are public Deezer playlists (Deezer's
// catalog needs no auth), verified to have strong 30-second preview coverage.
// Any track missing a Deezer preview falls back to iTunes at play time.
export const FEATURED_PLAYLISTS = [
    { id: '13693726841', name: 'Top Hits',        emoji: '🔥', accent: '#20D97A' },
    { id: '4888783264',  name: 'Pop Rewind',      emoji: '🎤', accent: '#FF5CA8' },
    { id: '1306931615',  name: 'Rock Essentials', emoji: '🎸', accent: '#FF6B4A' },
    { id: '1677006641',  name: 'Hip-Hop Hits',    emoji: '🎧', accent: '#FFB020' },
    { id: '248297032',   name: '2000s Throwback', emoji: '📀', accent: '#8B5CF6' },
    { id: '1913763402',  name: '80s Party',       emoji: '🕺', accent: '#22C3E6' },
];

export const FEATURED_PROVIDER = 'deezer';
