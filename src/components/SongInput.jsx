import React, { useState, useEffect } from 'react';
import { searchTracks } from '../services/spotify';

const SongInput = ({ token, onGuess, disabled }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 2 && token) {
        setLoading(true);
        try {
          const tracks = await searchTracks(token, query);
          setResults(tracks);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, token]);

  return (
    <div className="song-input-container">
      <input
        className="search-input"
        type="text"
        placeholder="Search for the song..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
      />
      {loading && <div className="loading">Searching...</div>}
      {results.length > 0 && (
        <ul className="results-list">
          {results.map(track => (
            <li key={track.id} className="result-item" onClick={() => {
                onGuess(track);
                setQuery('');
                setResults([]);
            }}>
              <div className="track-info">
                <span className="track-name">{track.name}</span>
                <span className="artist-name">{track.artists.map(a => a.name).join(', ')}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SongInput;
