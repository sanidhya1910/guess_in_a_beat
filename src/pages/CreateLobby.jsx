import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { searchTracks as searchItunesTracks } from '../services/music';
import { connectSocket, emitAck, storeSession } from '../services/socket';
import { FEATURED_PLAYLISTS, FEATURED_PROVIDER } from '../data/featuredPlaylists';
import { ArrowLeftIcon, XIcon } from '../components/Icons';

const PROVIDERS = [
    { id: 'spotify', label: 'Spotify' },
    { id: 'apple', label: 'Apple Music' },
    { id: 'deezer', label: 'Deezer' },
    { id: 'itunes', label: 'iTunes' },
];

const PLACEHOLDERS = {
    spotify: 'Paste Spotify playlist, album, or track URLs — one per line',
    apple: 'Paste Apple Music playlist, album, or song URLs — one per line',
    deezer: 'Paste Deezer playlist, album, or track URLs — one per line',
};

const CreateLobby = () => {
    const navigate = useNavigate();
    const [displayName, setDisplayName] = useState('');
    const [sourceMode, setSourceMode] = useState('featured'); // 'featured' | 'custom'
    const [selectedFeatured, setSelectedFeatured] = useState(null); // featured playlist id
    const [featuredMeta, setFeaturedMeta] = useState({}); // id -> { cover, count }
    const [provider, setProvider] = useState('spotify');
    const [sourceInput, setSourceInput] = useState('');
    const [maxPlayers, setMaxPlayers] = useState(4);
    const [songLimit, setSongLimit] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableProviders, setAvailableProviders] = useState({ spotify: true, apple: true, deezer: true, itunes: true });

    useEffect(() => {
        axios.get('/api/providers').then(({ data }) => setAvailableProviders(data)).catch(() => {});
    }, []);

    useEffect(() => {
        let cancelled = false;
        Promise.all(
            FEATURED_PLAYLISTS.map(async (p) => {
                try {
                    const { data } = await axios.get(`/api/deezer/playlist/${p.id}`);
                    return [p.id, { cover: data.picture_medium, count: data.nb_tracks }];
                } catch {
                    return [p.id, {}];
                }
            })
        ).then((entries) => {
            if (!cancelled) setFeaturedMeta(Object.fromEntries(entries));
        });
        return () => { cancelled = true; };
    }, []);

    // iTunes-only search-and-add lineup building (mirrors Setup.jsx).
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
        if (!selectedTracks.some((t) => t.id === track.id)) setSelectedTracks((prev) => [...prev, track]);
        setQuery('');
        setResults([]);
    };

    const removeTrack = (id) => setSelectedTracks((prev) => prev.filter((t) => t.id !== id));

    const handleCreate = async () => {
        if (!displayName.trim()) return setError('Enter your name to get started.');

        let payload;
        if (sourceMode === 'featured') {
            if (!selectedFeatured) return setError('Pick a featured playlist to get started.');
            // Featured playlists are public Deezer playlists — hand the server
            // the Deezer URL and let its existing resolver load the tracks.
            payload = {
                provider: FEATURED_PROVIDER,
                sourceInput: `https://www.deezer.com/playlist/${selectedFeatured}`,
            };
        } else if (provider === 'itunes') {
            if (selectedTracks.length === 0) return setError('Search for and add at least one song.');
            payload = { provider, trackIds: selectedTracks.map((t) => t.id) };
        } else {
            if (!sourceInput.trim()) return setError('Paste at least one playlist or track link.');
            payload = { provider, sourceInput };
        }

        setLoading(true);
        setError('');

        try {
            connectSocket();
            const res = await emitAck('create_lobby', {
                displayName: displayName.trim(),
                maxPlayers,
                songLimit: songLimit ? parseInt(songLimit, 10) : undefined,
                ...payload,
            });
            storeSession(res.code, res.playerId);
            navigate(`/lobby/${res.code}`);
        } catch (e) {
            setError(e.message || 'Failed to create the party.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="setup-page">
            <button className="back-link" onClick={() => navigate('/play')}>
                <ArrowLeftIcon size={16} /> Back
            </button>

            <div className="setup-header">
                <h1 className="setup-title">Create a <span>Party</span></h1>
                <p className="setup-subtitle">Pick a source, invite friends, compete live</p>
            </div>

            <div className="setup-card">
                <div className="field">
                    <label className="field-label" htmlFor="display-name">Your Name</label>
                    <input
                        id="display-name"
                        type="text"
                        className="field-input"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Alex"
                        maxLength={24}
                    />
                </div>

                <div className="field">
                    <label className="field-label">Music Source</label>
                    <div className="provider-select">
                        <button
                            type="button"
                            className={`provider-chip${sourceMode === 'featured' ? ' is-active' : ''}`}
                            onClick={() => setSourceMode('featured')}
                        >
                            Featured
                        </button>
                        <button
                            type="button"
                            className={`provider-chip${sourceMode === 'custom' ? ' is-active' : ''}`}
                            onClick={() => setSourceMode('custom')}
                        >
                            Your own playlist
                        </button>
                    </div>
                </div>

                {sourceMode === 'featured' ? (
                    <div className="field">
                        <label className="field-label">Pick a Playlist</label>
                        <div className="playlist-grid playlist-grid--compact">
                            {FEATURED_PLAYLISTS.map((p) => {
                                const info = featuredMeta[p.id] || {};
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        className={`playlist-card${selectedFeatured === p.id ? ' is-selected' : ''}`}
                                        onClick={() => setSelectedFeatured(p.id)}
                                        style={{ '--accent': p.accent }}
                                    >
                                        <span className="playlist-cover" aria-hidden="true">
                                            {info.cover ? <img src={info.cover} alt="" loading="lazy" /> : <span className="playlist-emoji">{p.emoji}</span>}
                                        </span>
                                        <span className="playlist-info">
                                            <span className="playlist-name">{p.emoji} {p.name}</span>
                                            {info.count != null && <span className="playlist-count">{info.count} songs</span>}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                <>
                <div className="field">
                    <label className="field-label">Provider</label>
                    <div className="provider-select">
                        {PROVIDERS.map((p) => {
                            const disabled = availableProviders[p.id] === false;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    className={`provider-chip${provider === p.id ? ' is-active' : ''}`}
                                    onClick={() => setProvider(p.id)}
                                    disabled={disabled}
                                    title={disabled ? 'Not set up on this server' : undefined}
                                >
                                    {p.label}{disabled ? ' (not set up)' : ''}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {provider === 'itunes' ? (
                    <div className="field">
                        <label className="field-label" htmlFor="lobby-song-search">Search &amp; Add Songs</label>
                        <div className="search-wrap">
                            <input
                                id="lobby-song-search"
                                className="search-input"
                                type="text"
                                placeholder="Search for a song to add…"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoComplete="off"
                            />
                            {searching && (
                                <div className="search-spinner"><div className="spinner" /></div>
                            )}
                            {results.length > 0 && (
                                <ul className="search-dropdown" role="listbox">
                                    {results.map((track) => (
                                        <li key={track.id} className="dropdown-item" onMouseDown={(e) => e.preventDefault()} onClick={() => addTrack(track)}>
                                            {track.album?.images?.[2]?.url && (
                                                <img src={track.album.images[2].url} alt="" className="dropdown-thumb" />
                                            )}
                                            <div className="dropdown-info">
                                                <span className="dropdown-name">{track.name}</span>
                                                <span className="dropdown-artist">{track.artists.map((a) => a.name).join(', ')}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <span className="field-hint">{selectedTracks.length} song{selectedTracks.length === 1 ? '' : 's'} added</span>
                        {selectedTracks.length > 0 && (
                            <ul className="selected-track-list">
                                {selectedTracks.map((t) => (
                                    <li key={t.id} className="selected-track-item">
                                        <span className="dropdown-name">{t.name}</span>
                                        <span className="dropdown-artist">{t.artists.map((a) => a.name).join(', ')}</span>
                                        <button type="button" className="remove-track-btn" onClick={() => removeTrack(t.id)} aria-label={`Remove ${t.name}`}>
                                            <XIcon size={14} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : (
                    <div className="field">
                        <label className="field-label" htmlFor="lobby-source-input">Playlist Links</label>
                        <textarea
                            id="lobby-source-input"
                            className="field-textarea"
                            rows={4}
                            value={sourceInput}
                            onChange={(e) => setSourceInput(e.target.value)}
                            placeholder={PLACEHOLDERS[provider]}
                        />
                    </div>
                )}
                </>
                )}

                <div className="field">
                    <label className="field-label">Party Size</label>
                    <div className="stepper">
                        <button type="button" className="stepper-btn" onClick={() => setMaxPlayers((n) => Math.max(2, n - 1))} disabled={maxPlayers <= 2}>−</button>
                        <span className="stepper-value">{maxPlayers}</span>
                        <button type="button" className="stepper-btn" onClick={() => setMaxPlayers((n) => Math.min(4, n + 1))} disabled={maxPlayers >= 4}>+</button>
                    </div>
                    <span className="field-hint">2–4 players</span>
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="lobby-song-limit">
                        Song Limit <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                        id="lobby-song-limit"
                        type="number"
                        className="field-input"
                        value={songLimit}
                        onChange={(e) => setSongLimit(e.target.value)}
                        placeholder="All songs"
                        min="1"
                        style={{ maxWidth: '160px' }}
                    />
                </div>

                {error && <div className="setup-error">{error}</div>}

                <button className="btn-primary" onClick={handleCreate} disabled={loading}>
                    {loading ? 'Creating party…' : 'Create Party'}
                </button>
            </div>
        </div>
    );
};

export default CreateLobby;
