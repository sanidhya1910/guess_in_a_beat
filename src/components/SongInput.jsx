import React, { useState, useEffect, useRef } from 'react';
import { searchTracks as searchItunesTracks } from '../services/music';
import { SearchIcon } from './Icons';

// The in-game guess box always searches iTunes for suggestions, regardless of
// which provider the game's tracks came from. Guesses are matched by song name
// + artist (see utils/matching), not by exact catalog id, so the suggestion
// source doesn't need to match the provider — and iTunes search is free,
// login-free, and reliable, whereas Deezer's search API frequently returns
// empty results and Spotify's needs a logged-in token.
const SongInput = ({ onGuess, disabled }) => {
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
                    setResults(await searchItunesTracks(query));
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
    }, [query]);

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
