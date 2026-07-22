import React, { useState, useEffect, useRef } from 'react';
import { getPlaylistTracks as getSpotifyPlaylistTracks, getSeveralTracks as getSpotifySeveralTracks } from '../services/spotify';
import { getPlaylistTracks as getApplePlaylistTracks, getSeveralTracks as getAppleSeveralTracks } from '../services/appleMusic';
import { getPlaylistTracks as getDeezerPlaylistTracks, getSeveralTracks as getDeezerSeveralTracks } from '../services/deezer';
import { searchTracks as searchItunesTracks } from '../services/music';
import { parseLines } from '../utils/parsePlaylistInput';
import { MusicIcon, SearchIcon, XIcon } from './Icons';

const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const PROVIDER_LABELS = {
    spotify: 'Spotify',
    apple: 'Apple Music',
    deezer: 'Deezer',
    itunes: 'iTunes',
};

const PLACEHOLDERS = {
    spotify:
        'Paste one or more Spotify playlist URLs — one per line\n\n' +
        'https://open.spotify.com/playlist/…\n' +
        'https://open.spotify.com/playlist/…',
    apple:
        'Paste one or more Apple Music playlist/song URLs — one per line\n\n' +
        'https://music.apple.com/us/playlist/…/pl.…\n' +
        'https://music.apple.com/us/song/…',
    deezer:
        'Paste one or more Deezer playlist/track URLs — one per line\n\n' +
        'https://www.deezer.com/playlist/…\n' +
        'https://www.deezer.com/track/…',
};

const Setup = ({ provider, token, onStartGame }) => {
    const [input, setInput] = useState('');
    const [songLimit, setSongLimit] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // iTunes-only: search-and-add lineup building.
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedTracks, setSelectedTracks] = useState([]);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (provider !== 'itunes') return;
        clearTimeout(debounceRef.current);
        if (query.trim().length <= 2) {
            setResults([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                setResults(await searchItunesTracks(query));
            } catch (e) {
                console.error(e);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [query, provider]);

    const addTrack = (track) => {
        if (!selectedTracks.some((t) => t.id === track.id)) {
            setSelectedTracks((prev) => [...prev, track]);
        }
        setQuery('');
        setResults([]);
    };

    const removeTrack = (id) => {
        setSelectedTracks((prev) => prev.filter((t) => t.id !== id));
    };

    const handleStartItunes = () => {
        if (selectedTracks.length === 0) {
            setError('Search for and add at least one song to get started.');
            return;
        }
        let shuffled = shuffleArray(selectedTracks);
        const limit = parseInt(songLimit, 10);
        if (!isNaN(limit) && limit > 0) shuffled = shuffled.slice(0, limit);
        onStartGame(shuffled);
    };

    const handleStartLinks = async () => {
        if (!input.trim()) {
            setError('Paste at least one playlist or track link to get started.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { playlists, tracks: trackEntries, failed } = parseLines(input, provider);
            let allTracks = [];
            let sawNotFound = false;   // 404 — for Spotify, an editorial/algorithmic playlist
            let sawForbidden = false;  // 401/403 — auth expired, or app in Spotify Development Mode

            const noteError = (err, label) => {
                console.error(`Error fetching ${label}:`, err);
                const status = err.response?.status;
                if (status === 404) sawNotFound = true;
                if (status === 401 || status === 403) sawForbidden = true;
                failed.push(label);
            };

            for (const p of playlists) {
                try {
                    let tracks;
                    if (provider === 'spotify') tracks = await getSpotifyPlaylistTracks(token, p.id);
                    else if (provider === 'apple') tracks = await getApplePlaylistTracks(p.storefront, p.id);
                    else tracks = await getDeezerPlaylistTracks(p.id);
                    allTracks = [...allTracks, ...tracks];
                } catch (err) {
                    noteError(err, `playlist ${p.id}`);
                }
            }

            if (trackEntries.length > 0) {
                try {
                    const ids = trackEntries.map((p) => p.id);
                    let tracks;
                    if (provider === 'spotify') tracks = await getSpotifySeveralTracks(token, ids);
                    else if (provider === 'apple') tracks = await getAppleSeveralTracks(trackEntries[0].storefront, ids);
                    else tracks = await getDeezerSeveralTracks(ids);
                    allTracks = [...allTracks, ...tracks];
                } catch (err) {
                    noteError(err, 'tracks');
                }
            }

            if (allTracks.length === 0) {
                let message;
                if (provider === 'spotify' && sawNotFound) {
                    // Spotify blocks Web API access to playlists it owns (Today's Top Hits,
                    // Discover Weekly, RapCaviar, etc.), so these 404 even when public.
                    message =
                        'Spotify no longer lets apps load its own editorial or algorithmic playlists ' +
                        '(Today’s Top Hits, Discover Weekly, RapCaviar, etc.), even when public. ' +
                        'Use a playlist made by a person, or try the Deezer / Apple Music / iTunes options.';
                } else if (provider === 'spotify' && sawForbidden) {
                    message =
                        'Spotify denied access. Log out and back in, and if this is your own Spotify app in ' +
                        'Development Mode, add your account under Users and Access in the Spotify dashboard.';
                } else if (failed.length > 0) {
                    message = 'Could not load those links. Make sure they are public and correctly formatted.';
                } else {
                    message = 'No tracks found. Check your playlist links or song URLs.';
                }
                setError(message);
                return;
            }

            const unique = allTracks.filter((t, i, arr) => i === arr.findIndex((x) => x.id === t.id));
            let shuffled = shuffleArray(unique);

            const limit = parseInt(songLimit, 10);
            if (!isNaN(limit) && limit > 0) shuffled = shuffled.slice(0, limit);

            onStartGame(shuffled);
        } catch (e) {
            console.error(e);
            setError(e.message || 'Failed to load tracks. Check your input and try again.');
        } finally {
            setLoading(false);
        }
    };

    const isSearchProvider = provider === 'itunes';

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
                        Snippets play right in the browser — no subscription needed. Tracks
                        without a native preview fall back to an iTunes preview automatically.
                    </div>
                </div>

                {isSearchProvider ? (
                    <div className="field">
                        <label className="field-label" htmlFor="song-search">
                            Search &amp; Add Songs
                        </label>
                        <div className="search-wrap">
                            <span className="search-icon">
                                <SearchIcon size={17} color="var(--text-1)" />
                            </span>
                            <input
                                id="song-search"
                                className="search-input"
                                type="text"
                                placeholder="Search for a song to add…"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoComplete="off"
                            />
                            {searching && (
                                <div className="search-spinner">
                                    <div className="spinner" />
                                </div>
                            )}
                            {results.length > 0 && (
                                <ul className="search-dropdown" role="listbox">
                                    {results.map((track) => (
                                        <li
                                            key={track.id}
                                            className="dropdown-item"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => addTrack(track)}
                                        >
                                            {track.album?.images?.[2]?.url && (
                                                <img src={track.album.images[2].url} alt="" className="dropdown-thumb" />
                                            )}
                                            <div className="dropdown-info">
                                                <span className="dropdown-name">{track.name}</span>
                                                <span className="dropdown-artist">
                                                    {track.artists.map((a) => a.name).join(', ')}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <span className="field-hint">
                            {selectedTracks.length} song{selectedTracks.length === 1 ? '' : 's'} added
                        </span>

                        {selectedTracks.length > 0 && (
                            <ul className="selected-track-list">
                                {selectedTracks.map((t) => (
                                    <li key={t.id} className="selected-track-item">
                                        <span className="dropdown-name">{t.name}</span>
                                        <span className="dropdown-artist">{t.artists.map((a) => a.name).join(', ')}</span>
                                        <button
                                            type="button"
                                            className="remove-track-btn"
                                            onClick={() => removeTrack(t.id)}
                                            aria-label={`Remove ${t.name}`}
                                        >
                                            <XIcon size={14} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : (
                    <div className="field">
                        <label className="field-label" htmlFor="playlist-input">
                            Playlist Links
                        </label>
                        <textarea
                            id="playlist-input"
                            className="field-textarea"
                            rows={5}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={PLACEHOLDERS[provider]}
                        />
                        <span className="field-hint">Multiple playlists are merged and shuffled together</span>
                        {provider === 'spotify' && (
                            <span className="field-hint">
                                Use a playlist made by a person — Spotify’s own playlists (Discover Weekly,
                                Today’s Top Hits, etc.) can’t be loaded through its API anymore.
                            </span>
                        )}
                    </div>
                )}

                <div className="field">
                    <label className="field-label" htmlFor="song-limit">
                        Song Limit <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                        id="song-limit"
                        type="number"
                        className="field-input"
                        value={songLimit}
                        onChange={(e) => setSongLimit(e.target.value)}
                        placeholder="All songs"
                        min="1"
                        style={{ maxWidth: '160px' }}
                    />
                    <span className="field-hint">Cap how many songs are loaded into the game</span>
                </div>

                {error && <div className="setup-error">{error}</div>}

                <button
                    className="btn-primary"
                    onClick={isSearchProvider ? handleStartItunes : handleStartLinks}
                    disabled={loading}
                >
                    {loading ? 'Loading tracks…' : `Start Game (${PROVIDER_LABELS[provider]})`}
                </button>
            </div>
        </div>
    );
};

export default Setup;
