import React, { useState } from 'react';
import { getPlaylistTracks, getSeveralTracks } from '../services/spotify';

const Setup = ({ token, onStartGame }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const extractIdFromUrl = (url) => {
        try {
            if (url.includes('spotify.com')) {
                const parts = url.split('/');
                const lastPart = parts[parts.length - 1];
                return lastPart.split('?')[0];
            }
            return url.trim();
        } catch (e) {
            return null;
        }
    };

    const handleStart = async () => {
        if (!input.trim()) {
            setError('Please provide a Playlist Link or a list of Song Links');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let tracks = [];

            if (input.includes('/playlist/')) {
                const playlistId = extractIdFromUrl(input);
                tracks = await getPlaylistTracks(token, playlistId);
            } else {
                const lines = input.split(/[\n,]/).map(line => line.trim()).filter(line => line);
                const trackIds = lines.map(line => extractIdFromUrl(line)).filter(id => id);

                if (trackIds.length === 0) {
                    throw new Error("No valid track IDs found in input.");
                }

                tracks = await getSeveralTracks(token, trackIds);
            }

            if (tracks.length === 0) {
                setError('No tracks found. Check your playlist link or song URLs.');
            } else {
                // Shuffle tracks
                const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                onStartGame(shuffled);
            }
        } catch (e) {
            console.error(e);
            setError(e.message || 'Failed to load tracks. Check your input.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="setup-container">
            <h1>GuessInABeat</h1>
            <p>Test your music knowledge! Guess the song from short snippets.</p>

            <div className="card">
                <div className="info-box">
                    <strong>📱 Make sure Spotify is open</strong>
                    <p>Open Spotify on your desktop, mobile, or web browser before starting.</p>
                </div>

                <div className="form-group">
                    <label>Spotify Playlist Link OR List of Song Links</label>
                    <textarea
                        className="input-field"
                        rows="5"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Paste a Playlist URL (e.g., https://open.spotify.com/playlist/...)&#10;OR&#10;Paste multiple Song URLs (one per line)"
                    />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button className="start-btn" onClick={handleStart} disabled={loading}>
                    {loading ? 'Loading Tracks...' : 'Start Game'}
                </button>
            </div>
        </div>
    );
};

export default Setup;
