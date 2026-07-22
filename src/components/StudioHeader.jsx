import React, { useState } from 'react';
import { getHistory, getActiveProvider, clearHistory, PROVIDER_LABELS } from '../services/profile';
import { SpotifyIcon, AppleMusicIcon, DeezerIcon, AppleIcon, TrophyIcon, XIcon } from './Icons';

const PROVIDER_ICON = {
    spotify: SpotifyIcon,
    apple: AppleMusicIcon,
    deezer: DeezerIcon,
    itunes: AppleIcon,
};

const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' +
        d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const StudioHeader = ({ profile }) => {
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState(() => getHistory());
    const activeProvider = getActiveProvider();
    const ProviderIcon = activeProvider ? PROVIDER_ICON[activeProvider] : null;

    const handleClear = () => {
        clearHistory();
        setHistory([]);
    };

    return (
        <div className="studio-header">
            <div className="studio-greeting">
                {profile?.name && <span className="studio-hi">Hi, {profile.name}</span>}
            </div>

            <div className="studio-actions">
                {activeProvider && (
                    <span className="provider-indicator" title={`Current music source: ${PROVIDER_LABELS[activeProvider]}`}>
                        {ProviderIcon && <ProviderIcon size={15} />}
                        {PROVIDER_LABELS[activeProvider]}
                    </span>
                )}
                <button
                    className="history-btn"
                    onClick={() => { setHistory(getHistory()); setShowHistory(true); }}
                    title="Score history"
                >
                    <TrophyIcon size={15} />
                    History
                </button>
            </div>

            {showHistory && (
                <div className="history-overlay" onClick={() => setShowHistory(false)}>
                    <div className="history-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="history-panel-head">
                            <h3>Score History</h3>
                            <button className="history-close" onClick={() => setShowHistory(false)} aria-label="Close">
                                <XIcon size={16} />
                            </button>
                        </div>

                        {history.length === 0 ? (
                            <p className="history-empty">No games yet — play a round and your scores show up here.</p>
                        ) : (
                            <>
                                <ul className="history-list">
                                    {history.map((h, i) => (
                                        <li key={i} className="history-item">
                                            <div className="history-item-main">
                                                <span className="history-score">{h.score} pts</span>
                                                <span className="history-meta">
                                                    {h.mode === 'multiplayer' ? 'Party' : 'Solo'} · {PROVIDER_LABELS[h.provider] || h.provider}
                                                    {h.total != null && ` · ${h.correct}/${h.total} correct`}
                                                </span>
                                            </div>
                                            <span className="history-date">{formatDate(h.date)}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button className="history-clear" onClick={handleClear}>Clear history</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudioHeader;
