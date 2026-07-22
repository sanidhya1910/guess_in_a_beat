import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { connectSocket, emitAck, storeSession } from '../services/socket';
import { ArrowLeftIcon } from '../components/Icons';

const JoinLobby = () => {
    const navigate = useNavigate();
    const { code: codeFromLink } = useParams();
    const [code, setCode] = useState((codeFromLink || '').toUpperCase());
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleJoin = async () => {
        if (!displayName.trim()) return setError('Enter your name to get started.');
        if (!code.trim()) return setError('Enter the party code.');

        setLoading(true);
        setError('');

        try {
            connectSocket();
            const res = await emitAck('join_lobby', { code: code.trim().toUpperCase(), displayName: displayName.trim() });
            storeSession(code.trim().toUpperCase(), res.playerId);
            navigate(`/lobby/${code.trim().toUpperCase()}`);
        } catch (e) {
            const messages = {
                LOBBY_NOT_FOUND: 'No party found with that code.',
                ALREADY_STARTED: 'That party has already started.',
                LOBBY_FULL: 'That party is full.',
            };
            setError(messages[e.message] || e.message || 'Failed to join the party.');
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
                <h1 className="setup-title">Join a <span>Party</span></h1>
                <p className="setup-subtitle">Enter the code a friend shared with you</p>
            </div>

            <div className="setup-card">
                <div className="field">
                    <label className="field-label" htmlFor="join-code">Party Code</label>
                    <input
                        id="join-code"
                        type="text"
                        className="field-input"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="e.g. K9ZKTT"
                        maxLength={6}
                        style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    />
                </div>

                <div className="field">
                    <label className="field-label" htmlFor="join-display-name">Your Name</label>
                    <input
                        id="join-display-name"
                        type="text"
                        className="field-input"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Alex"
                        maxLength={24}
                    />
                </div>

                {error && <div className="setup-error">{error}</div>}

                <button className="btn-primary" onClick={handleJoin} disabled={loading}>
                    {loading ? 'Joining…' : 'Join Party'}
                </button>
            </div>
        </div>
    );
};

export default JoinLobby;
