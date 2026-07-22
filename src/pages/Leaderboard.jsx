import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeftIcon, TrophyIcon } from '../components/Icons';

const Leaderboard = () => {
    const { lobbyId } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        axios
            .get(`/api/lobbies/${lobbyId}/results`)
            .then(({ data }) => setResults(data))
            .catch(() => setError('Could not load results for this party.'));
    }, [lobbyId]);

    return (
        <div className="setup-page">
            <button className="back-link" onClick={() => navigate('/')}>
                <ArrowLeftIcon size={16} /> Home
            </button>

            <div className="setup-header">
                <h1 className="setup-title">Final <span>Results</span></h1>
                <p className="setup-subtitle">
                    {results ? `Party ${results.code} — ${results.provider}` : 'Loading…'}
                </p>
            </div>

            <div className="setup-card">
                {error && <div className="setup-error">{error}</div>}

                {results && (
                    <ul className="roster-list">
                        {results.players.map((p, i) => (
                            <li key={p.id} className="roster-item">
                                <span className="roster-name">
                                    {i === 0 && <TrophyIcon size={16} color="var(--green)" />}
                                    {p.displayName}
                                    {p.isHost && <span className="host-badge">Host</span>}
                                </span>
                                <span className="roster-score">{p.score} pts</span>
                            </li>
                        ))}
                    </ul>
                )}

                <button className="btn-primary" onClick={() => navigate('/play')}>
                    Play Again
                </button>
            </div>
        </div>
    );
};

export default Leaderboard;
