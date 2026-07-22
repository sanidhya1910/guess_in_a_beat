import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getPlaylistTracks as getDeezerPlaylistTracks } from '../services/deezer';
import { FEATURED_PLAYLISTS, FEATURED_PROVIDER } from '../data/featuredPlaylists';
import { ArrowLeftIcon } from '../components/Icons';

const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const LENGTHS = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: 'All', value: 0 },
];

const PlaylistPicker = ({ onPlay, onUseCustom }) => {
    const navigate = useNavigate();
    const [meta, setMeta] = useState({}); // id -> { cover, count }
    const [songCount, setSongCount] = useState(20);
    const [loadingId, setLoadingId] = useState(null);
    const [error, setError] = useState('');

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
            if (!cancelled) setMeta(Object.fromEntries(entries));
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const handlePick = async (playlist) => {
        setLoadingId(playlist.id);
        setError('');
        try {
            const tracks = await getDeezerPlaylistTracks(playlist.id);
            if (!tracks.length) {
                setError('That playlist couldn’t be loaded right now. Try another.');
                return;
            }
            let shuffled = shuffleArray(tracks);
            if (songCount > 0) shuffled = shuffled.slice(0, songCount);
            onPlay(shuffled, FEATURED_PROVIDER);
        } catch (e) {
            console.error(e);
            setError('That playlist couldn’t be loaded right now. Try another.');
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="setup-page">
            <button className="back-link" onClick={() => navigate('/')}>
                <ArrowLeftIcon size={16} /> Back
            </button>

            <div className="setup-header">
                <h1 className="setup-title">Pick a <span>Playlist</span></h1>
                <p className="setup-subtitle">Jump straight in — no account needed</p>
            </div>

            <div className="length-select" role="group" aria-label="Number of songs">
                <span className="length-label">Songs</span>
                {LENGTHS.map((l) => (
                    <button
                        key={l.label}
                        type="button"
                        className={`length-chip${songCount === l.value ? ' is-active' : ''}`}
                        onClick={() => setSongCount(l.value)}
                    >
                        {l.label}
                    </button>
                ))}
            </div>

            {error && <div className="setup-error">{error}</div>}

            <div className="playlist-grid">
                {FEATURED_PLAYLISTS.map((p) => {
                    const info = meta[p.id] || {};
                    const isLoading = loadingId === p.id;
                    return (
                        <button
                            key={p.id}
                            className="playlist-card"
                            onClick={() => handlePick(p)}
                            disabled={loadingId !== null}
                            style={{ '--accent': p.accent }}
                        >
                            <span className="playlist-cover" aria-hidden="true">
                                {info.cover ? (
                                    <img src={info.cover} alt="" loading="lazy" />
                                ) : (
                                    <span className="playlist-emoji">{p.emoji}</span>
                                )}
                                {isLoading && (
                                    <span className="playlist-loading">
                                        <span className="spinner" />
                                    </span>
                                )}
                            </span>
                            <span className="playlist-info">
                                <span className="playlist-name">{p.emoji} {p.name}</span>
                                {info.count != null && <span className="playlist-count">{info.count} songs</span>}
                            </span>
                        </button>
                    );
                })}
            </div>

            <button className="custom-playlist-link" onClick={onUseCustom}>
                Or use your own playlist →
            </button>
        </div>
    );
};

export default PlaylistPicker;
