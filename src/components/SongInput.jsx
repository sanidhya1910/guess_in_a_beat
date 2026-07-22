import React, { useState, useEffect, useRef } from 'react';
import { searchTracks as searchSpotifyTracks, getFreshToken } from '../services/spotify';
import { searchTracks as searchAppleTracks } from '../services/appleMusic';
import { searchTracks as searchDeezerTracks } from '../services/deezer';
import { searchTracks as searchItunesTracks } from '../services/music';
import { SearchIcon } from './Icons';

// Apple Music search here doesn't know which storefront the host's playlist
// came from (that's only threaded through Setup.jsx) — defaulting to 'us' is
// a reasonable simplification since guesses are matched fuzzily by name/artist,
// not by exact catalog id.
const DEFAULT_APPLE_STOREFRONT = 'us';

const SongInput = ({ provider = 'spotify', onGuess, disabled }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef(null);
    const listRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length > 2) {
                setLoading(true);
                try {
                    let tracks = [];
                    if (provider === 'apple') {
                        tracks = await searchAppleTracks(DEFAULT_APPLE_STOREFRONT, query);
                    } else if (provider === 'deezer') {
                        tracks = await searchDeezerTracks(query);
                    } else if (provider === 'itunes') {
                        tracks = await searchItunesTracks(query);
                    } else {
                        const token = await getFreshToken();
                        if (token) tracks = await searchSpotifyTracks(token, query);
                    }
                    setResults(tracks);
                    setSelectedIndex(-1);
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
                setSelectedIndex(-1);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, provider]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setResults([]);
                setSelectedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (selectedIndex >= 0 && listRef.current) {
            const item = listRef.current.children[selectedIndex];
            if (item) item.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    const handleKeyDown = (e) => {
        if (results.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            e.stopPropagation();
            handleSelect(results[selectedIndex]);
        } else if (e.key === 'Escape') {
            setResults([]);
            setSelectedIndex(-1);
        }
    };

    const handleSelect = (track) => {
        onGuess(track);
        setQuery('');
        setResults([]);
        setSelectedIndex(-1);
    };

    return (
        <div className="search-wrap" ref={containerRef}>
            <span className="search-icon">
                <SearchIcon size={17} color="var(--text-1)" />
            </span>
            <input
                className="search-input"
                type="text"
                placeholder="Search for a song…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                autoComplete="off"
                aria-label="Search for a song"
                aria-autocomplete="list"
                aria-haspopup="listbox"
            />
            {loading && (
                <div className="search-spinner">
                    <div className="spinner" />
                </div>
            )}
            {results.length > 0 && (
                <ul className="search-dropdown" ref={listRef} role="listbox">
                    {results.map((track, index) => (
                        <li
                            key={track.id}
                            className={`dropdown-item${index === selectedIndex ? ' is-selected' : ''}`}
                            role="option"
                            aria-selected={index === selectedIndex}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelect(track)}
                        >
                            {track.album?.images?.[2] && (
                                <img
                                    src={track.album.images[2].url}
                                    alt=""
                                    className="dropdown-thumb"
                                />
                            )}
                            <div className="dropdown-info">
                                <span className="dropdown-name">{track.name}</span>
                                <span className="dropdown-artist">
                                    {track.artists.map(a => a.name).join(', ')}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SongInput;
