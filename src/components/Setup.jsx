import React, { useState } from 'react';
import { getPlaylistTracks, getSeveralTracks } from '../services/spotify';

const Setup = ({ token, onStartGame }) => {
    const [input, setInput] = useState('');
    const [songLimit, setSongLimit] = useState('');
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

    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    const handleStart = async () => {
        if (!input.trim()) {
            setError('Please provide a Playlist Link or a list of Song Links');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let allTracks = [];
            const lines = input.split(/[\n]/).map(line => line.trim()).filter(line => line);
            
            // Check if there are multiple playlist links
            const playlistLinks = lines.filter(line => line.includes('/playlist/'));
            const trackLinks = lines.filter(line => line.includes('/track/'));
            
            // Handle multiple playlists
            if (playlistLinks.length > 0) {
                for (const playlistUrl of playlistLinks) {
                    const playlistId = extractIdFromUrl(playlistUrl);
                    if (playlistId) {
                        const tracks = await getPlaylistTracks(token, playlistId);
                        allTracks = [...allTracks, ...tracks];
                    }
                }
            }
            
            // Handle individual track links
            if (trackLinks.length > 0) {
                const trackIds = trackLinks.map(line => extractIdFromUrl(line)).filter(id => id);
                if (trackIds.length > 0) {
                    const tracks = await getSeveralTracks(token, trackIds);
                    allTracks = [...allTracks, ...tracks];
                }
            }

            // If no playlists or tracks found, try parsing as single playlist
            if (allTracks.length === 0 && input.includes('/playlist/')) {
                const playlistId = extractIdFromUrl(input);
                allTracks = await getPlaylistTracks(token, playlistId);
            }

            if (allTracks.length === 0) {
                setError('No tracks found. Check your playlist link or song URLs.');
                return;
            }

            // Remove duplicates based on track ID
            const uniqueTracks = allTracks.filter((track, index, self) =>
                index === self.findIndex(t => t.id === track.id)
            );

            // Shuffle tracks
            let shuffled = shuffleArray(uniqueTracks);

            // Apply song limit if specified
            const limit = parseInt(songLimit);
            if (!isNaN(limit) && limit > 0) {
                shuffled = shuffled.slice(0, limit);
            }

            onStartGame(shuffled);
        } catch (e) {
            console.error(e);
            setError(e.message || 'Failed to load tracks. Check your input.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="setup-container songless-setup">
            <h1 className="setup-title">Guess in a Beat</h1>
            <p className="setup-subtitle">Guess the song from short snippets</p>

            <div className="card setup-card">
                <div className="info-box">
                    <strong>📱 Make sure Spotify is open</strong>
                    <p>Open Spotify on your desktop, mobile, or web browser before starting.</p>
                </div>

                <div className="form-group">
                    <label>Spotify Playlist Links (one or more)</label>
                    <textarea
                        className="input-field"
                        rows="5"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Paste Playlist URLs (one per line to merge multiple playlists)&#10;&#10;Example:&#10;https://open.spotify.com/playlist/abc123&#10;https://open.spotify.com/playlist/xyz789"
                    />
                    <span className="help-text">Paste multiple playlist links to merge and shuffle them together</span>
                </div>

                <div className="form-group">
                    <label>Song Limit (optional)</label>
                    <input
                        type="number"
                        className="input-field limit-input"
                        value={songLimit}
                        onChange={(e) => setSongLimit(e.target.value)}
                        placeholder="Leave empty for all songs"
                        min="1"
                    />
                    <span className="help-text">Limit the number of songs loaded into the game</span>
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
