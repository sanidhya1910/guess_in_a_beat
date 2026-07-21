import React, { useState } from 'react';
import { getPlaylistTracks, getSeveralTracks } from '../services/spotify';
import { MusicIcon } from './Icons';

const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const Setup = ({ token, onStartGame }) => {
    const [input, setInput] = useState('');
    const [songLimit, setSongLimit] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const extractIdFromUrl = (url) => {
        try {
            const trimmedUrl = url.trim();

            if (trimmedUrl.includes('spotify.com') || trimmedUrl.includes('spotify.link')) {
                const playlistMatch = trimmedUrl.match(/\/playlist\/([a-zA-Z0-9]{22})/);
                if (playlistMatch) return playlistMatch[1];

                const trackMatch = trimmedUrl.match(/\/track\/([a-zA-Z0-9]{22})/);
                if (trackMatch) return trackMatch[1];

                const urlObj = new URL(trimmedUrl);
                const pathParts = urlObj.pathname.split('/').filter(p => p);
                if (pathParts.length >= 2) {
                    const id = pathParts[pathParts.length - 1];
                    if (/^[a-zA-Z0-9]{22}$/.test(id)) return id;
                }
            }

            if (/^[a-zA-Z0-9]{22}$/.test(trimmedUrl)) return trimmedUrl;

            return null;
        } catch {
            return null;
        }
    };

    const handleStart = async () => {
        if (!input.trim()) {
            setError('Paste at least one playlist or track link to get started.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let allTracks = [];
            const lines = input.split('\n').map(l => l.trim()).filter(l => l);
            const playlistLines = lines.filter(l => l.includes('/playlist/'));
            const trackLines = lines.filter(l => l.includes('/track/'));
            const failedPlaylists = [];

            for (const url of playlistLines) {
                const id = extractIdFromUrl(url);
                if (id) {
                    try {
                        const tracks = await getPlaylistTracks(token, id);
                        allTracks = [...allTracks, ...tracks];
                    } catch (err) {
                        console.error(`Error fetching playlist ${id}:`, err);
                        failedPlaylists.push(url);
                    }
                } else {
                    failedPlaylists.push(url);
                }
            }

            if (trackLines.length > 0) {
                const ids = trackLines.map(l => extractIdFromUrl(l)).filter(Boolean);
                if (ids.length > 0) {
                    const tracks = await getSeveralTracks(token, ids);
                    allTracks = [...allTracks, ...tracks];
                }
            }

            if (allTracks.length === 0) {
                setError(
                    failedPlaylists.length > 0
                        ? 'Could not load playlists. Make sure they are public or shared with you.'
                        : 'No tracks found. Check your playlist links or song URLs.'
                );
                return;
            }

            // Dedupe and shuffle
            const unique = allTracks.filter((t, i, arr) => i === arr.findIndex(x => x.id === t.id));
            let shuffled = shuffleArray(unique);

            const limit = parseInt(songLimit);
            if (!isNaN(limit) && limit > 0) shuffled = shuffled.slice(0, limit);

            onStartGame(shuffled);
        } catch (e) {
            console.error(e);
            setError(e.message || 'Failed to load tracks. Check your input and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="setup-page">
            <div className="setup-header">
                <h1 className="setup-title">
                    Guess in a <span>Beat</span>
                </h1>
                <p className="setup-subtitle">Identify songs from increasingly long snippets</p>
            </div>

            <div className="setup-card">
                <div className="setup-info">
                    <span className="setup-info-icon">
                        <MusicIcon size={16} />
                    </span>
                    <div className="setup-info-text">
                        <strong>Instant previews</strong>
                        Snippets play right in the browser — no Spotify Premium needed. Tracks
                        without a Spotify preview fall back to an iTunes preview automatically.
                    </div>
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="playlist-input">
                        Playlist Links
                    </label>
                    <textarea
                        id="playlist-input"
                        className="field-textarea"
                        rows={5}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={
                            'Paste one or more Spotify playlist URLs — one per line\n\n' +
                            'https://open.spotify.com/playlist/…\n' +
                            'https://open.spotify.com/playlist/…'
                        }
                    />
                    <span className="field-hint">Multiple playlists are merged and shuffled together</span>
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="song-limit">
                        Song Limit <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                        id="song-limit"
                        type="number"
                        className="field-input"
                        value={songLimit}
                        onChange={e => setSongLimit(e.target.value)}
                        placeholder="All songs"
                        min="1"
                        style={{ maxWidth: '160px' }}
                    />
                    <span className="field-hint">Cap how many songs are loaded into the game</span>
                </div>

                {error && <div className="setup-error">{error}</div>}

                <button className="btn-primary" onClick={handleStart} disabled={loading}>
                    {loading ? 'Loading tracks…' : 'Start Game'}
                </button>
            </div>
        </div>
    );
};

export default Setup;
