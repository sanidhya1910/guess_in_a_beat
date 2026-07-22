import React, { useState, useEffect, useMemo } from 'react';
import SongInput from '../components/SongInput';
import { PlayIcon, SkipIcon, CheckIcon, XIcon, MusicIcon } from '../components/Icons';
import { useSnippetPlayer } from '../hooks/useSnippetPlayer';
import { getSocket, emitAck } from '../services/socket';

const DEFAULT_DURATIONS = [0.1, 0.5, 1, 2, 5, 10];

const MultiplayerGame = ({ code, playerId, provider, initialTracks, durations, initialTrackIndex, players: initialPlayers }) => {
    const DURATIONS = durations && durations.length ? durations : DEFAULT_DURATIONS;
    const MAX_ATTEMPTS = DURATIONS.length;

    const [trackIndex, setTrackIndex] = useState(initialTrackIndex || 0);
    const [attemptNum, setAttemptNum] = useState(0);
    const [resolved, setResolved] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const [players, setPlayers] = useState(initialPlayers || []);

    const { isPlaying, playProgress, error, playSnippet: playSnippetRaw, stop } = useSnippetPlayer();

    const currentTrack = initialTracks[trackIndex];
    const currentDuration = DURATIONS[Math.min(attemptNum, DURATIONS.length - 1)];

    useEffect(() => {
        const socket = getSocket();
        const onRoundStart = ({ trackIndex: idx }) => {
            stop();
            setTrackIndex(idx);
            setAttemptNum(0);
            setResolved(false);
            setLastResult(null);
        };
        const onScoreUpdate = (update) => {
            setPlayers((prev) =>
                prev.map((p) => (p.id === update.playerId ? { ...p, score: update.score, correctCount: update.correctCount } : p))
            );
        };
        socket.on('round_start', onRoundStart);
        socket.on('score_update', onScoreUpdate);
        return () => {
            socket.off('round_start', onRoundStart);
            socket.off('score_update', onScoreUpdate);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const playSnippet = () => playSnippetRaw(currentTrack, currentDuration);

    const handleGuess = async (guessedTrack) => {
        if (resolved) return;
        try {
            const res = await emitAck('submit_guess', { code, guessedTrack, attemptNum });
            if (res.correct) {
                setResolved(true);
                setLastResult('correct');
            } else if (res.exhausted) {
                setResolved(true);
                setLastResult('exhausted');
            } else {
                setAttemptNum((n) => Math.min(n + 1, MAX_ATTEMPTS - 1));
                setLastResult('wrong');
            }
        } catch (e) {
            console.error(e);
        }
    };

    // A skip is submitted as a guaranteed-non-match guess so the server's
    // round-advance bookkeeping (attempts/resolved) stays consistent either way.
    const handleSkip = () => handleGuess({ id: '__skip__', name: '', artists: [] });

    const sortedPlayers = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);

    if (!currentTrack) return <div className="no-tracks">Loading next round…</div>;

    return (
        <div className="game-page">
            <header className="game-header">
                <div className="game-header-center">
                    <div className="game-wordmark">
                        Guess in a <span>Beat</span>
                    </div>
                    <div className="game-header-meta">
                        <span className="meta-pill">
                            <MusicIcon size={11} />
                            {trackIndex + 1} / {initialTracks.length}
                        </span>
                    </div>
                </div>
            </header>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                <ul className="roster-list">
                    {sortedPlayers.map((p) => (
                        <li key={p.id} className={`roster-item${p.connected === false ? ' is-disconnected' : ''}`}>
                            <span className="roster-name">
                                {p.displayName}
                                {p.id === playerId ? ' (you)' : ''}
                            </span>
                            <span className="roster-score">{p.score}</span>
                        </li>
                    ))}
                </ul>

                <div className="player-section">
                    <button
                        className={`play-btn${isPlaying ? ' is-playing' : ''}`}
                        onClick={playSnippet}
                        disabled={isPlaying || resolved}
                        title={isPlaying ? 'Playing…' : 'Play snippet'}
                        aria-label={isPlaying ? 'Playing' : 'Play snippet'}
                    >
                        {isPlaying ? (
                            <div className="sound-bars" aria-hidden="true">
                                <span /><span /><span /><span /><span />
                            </div>
                        ) : (
                            <PlayIcon size={30} />
                        )}
                    </button>
                    <p className="attempt-hint">{currentDuration}s clip — attempt {attemptNum + 1}/{MAX_ATTEMPTS}</p>
                    {error && <p className="player-error">{error}</p>}
                </div>

                {lastResult && (
                    <div className={`result-verdict ${lastResult === 'correct' ? 'won' : 'lost'}`}>
                        {lastResult === 'correct' && <><CheckIcon size={13} color="var(--green)" /> Correct!</>}
                        {lastResult === 'exhausted' && <><XIcon size={13} color="var(--red)" /> Out of attempts</>}
                        {lastResult === 'wrong' && <><XIcon size={13} color="var(--red)" /> Not quite — try again</>}
                    </div>
                )}

                {resolved && (
                    <div className="track-reveal">
                        {currentTrack.album?.images?.[0]?.url && (
                            <img src={currentTrack.album.images[0].url} alt={`${currentTrack.name} album art`} className="album-art won" />
                        )}
                        <div className="reveal-info">
                            <h3 className="reveal-title">{currentTrack.name}</h3>
                            <p className="reveal-artist">{currentTrack.artists.map((a) => a.name).join(', ')}</p>
                        </div>
                    </div>
                )}

                {resolved ? (
                    <p className="field-hint" style={{ textAlign: 'center' }}>Waiting for other players…</p>
                ) : (
                    <div className="guess-row">
                        <SongInput provider={provider} onGuess={handleGuess} />
                        <button className="skip-btn" onClick={handleSkip} title="Skip this attempt">
                            <SkipIcon size={14} />
                            Skip
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default MultiplayerGame;
