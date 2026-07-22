import React, { useState, useEffect } from 'react';
import SongInput from './SongInput';
import { PlayIcon, SkipIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon, XIcon, MusicIcon, TrophyIcon } from './Icons';
import { isCorrectGuess as checkGuess } from '../utils/matching';
import { useSnippetPlayer } from '../hooks/useSnippetPlayer';

const DURATIONS = [0.1, 0.5, 1, 2, 5, 10];
const POINTS    = [6, 5, 4, 3, 2, 1];
const MAX_ATTEMPTS = 6;
const TOTAL_DURATION = DURATIONS.reduce((a, b) => a + b, 0);

const Game = ({ provider, token, tracks, onExit }) => {
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [guessCount, setGuessCount] = useState(0);
    const [gameState, setGameState] = useState('playing'); // 'playing' | 'won' | 'lost'
    const [guesses, setGuesses] = useState([]);
    const [score, setScore] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);

    const { isPlaying, isContinuousPlay, playProgress, error, playSnippet: playSnippetRaw, playContinuously: playContinuouslyRaw, stop } = useSnippetPlayer();

    const currentTrack   = tracks[currentTrackIndex];
    const currentDuration = DURATIONS[Math.min(guessCount, DURATIONS.length - 1)];
    const currentPoints   = POINTS[Math.min(guessCount, POINTS.length - 1)];
    const isGameOver = currentTrackIndex >= tracks.length - 1 && gameState !== 'playing';

    const isCorrectGuess = (guessedTrack) => checkGuess(guessedTrack, currentTrack);
    const playSnippet = () => playSnippetRaw(currentTrack, currentDuration);
    const playContinuously = () => playContinuouslyRaw(currentTrack);

    // ── Keyboard shortcuts ─────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.code === 'Space' && gameState === 'playing' && !isPlaying) {
                e.preventDefault();
                playSnippet();
            }
            if (e.code === 'Enter' && gameState !== 'playing' && currentTrackIndex < tracks.length - 1) {
                e.preventDefault();
                handleNextSong();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [gameState, isPlaying, currentTrackIndex, tracks.length]);

    // ── Guess handling ─────────────────────────────────────────────────────
    const handleGuess = (guessedTrack) => {
        const correct = isCorrectGuess(guessedTrack);
        const newGuess = { track: guessedTrack, isCorrect: correct, points: correct ? currentPoints : 0 };
        setGuesses(prev => [...prev, newGuess]);

        if (correct) {
            setScore(s => s + currentPoints);
            setCorrectAnswers(c => c + 1);
            setGameState('won');
            playContinuously();
        } else {
            const next = guessCount + 1;
            if (next >= DURATIONS.length) {
                setGuessCount(next);
                setGameState('lost');
                playContinuously();
            } else {
                setGuessCount(next);
            }
        }
    };

    const handleSkip = () => {
        const next = guessCount + 1;
        setGuesses(prev => [...prev, { track: { name: 'Skipped', artists: [{ name: '' }] }, isCorrect: false, skipped: true }]);
        if (next >= DURATIONS.length) {
            setGuessCount(next);
            setGameState('lost');
            playContinuously();
        } else {
            setGuessCount(next);
        }
    };

    const handleNextSong = async () => {
        stop();

        if (currentTrackIndex < tracks.length - 1) {
            setTotalQuestions(q => q + 1);
            setCurrentTrackIndex(i => i + 1);
            setGuessCount(0);
            setGameState('playing');
            setGuesses([]);
        }
    };

    // ── Build attempt bar data ─────────────────────────────────────────────
    const attemptBars = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
        const guess = guesses[i];
        if (!guess) return { status: 'empty', duration: DURATIONS[i], points: POINTS[i] };
        if (guess.isCorrect) return {
            status: 'correct',
            trackName: guess.track.name,
            trackArtist: guess.track.artists.map(a => a.name).join(', '),
            points: guess.points,
            duration: DURATIONS[i],
        };
        if (guess.skipped) return { status: 'skipped', trackName: 'Skipped', duration: DURATIONS[i] };
        return {
            status: 'wrong',
            trackName: guess.track.name,
            trackArtist: guess.track.artists.map(a => a.name).join(', '),
            duration: DURATIONS[i],
        };
    });

    // ── Timeline cursor position ───────────────────────────────────────────
    const getTimelineLeft = () => {
        let cumulative = 0;
        for (let i = 0; i < guessCount; i++) cumulative += DURATIONS[i];
        return (cumulative / TOTAL_DURATION) * 100;
    };

    if (!currentTrack) return <div className="no-tracks">No tracks available.</div>;

    const pointsEarned = guesses.find(g => g.isCorrect)?.points;

    return (
        <div className="game-page">
            {/* ── Header ── */}
            <header className="game-header">
                <button className="game-header-back" onClick={onExit} title="Exit game">
                    <ArrowLeftIcon size={20} />
                </button>
                <div className="game-header-center">
                    <div className="game-wordmark">
                        Guess in a <span>Beat</span>
                    </div>
                    <div className="game-header-meta">
                        <span className="meta-pill score">
                            <TrophyIcon size={11} />
                            {score}
                        </span>
                        <span className="meta-pill">
                            <MusicIcon size={11} />
                            {currentTrackIndex + 1} / {tracks.length}
                        </span>
                    </div>
                </div>
                <div className="game-header-spacer" />
            </header>

            {/* ── Main ── */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

                {/* Attempt bars */}
                <div className="attempt-stack">
                    {attemptBars.map((bar, i) => {
                        const isCurrent = i === guessCount && gameState === 'playing';
                        let rowClass = 'attempt-row';
                        if (bar.status === 'correct') rowClass += ' is-correct';
                        else if (bar.status === 'wrong') rowClass += ' is-wrong';
                        else if (bar.status === 'skipped') rowClass += ' is-skipped';
                        else if (isCurrent) rowClass += ' is-current';

                        return (
                            <div key={i} className={rowClass}>
                                <div className="attempt-row-inner">
                                    <div className="attempt-icon">
                                        {bar.status === 'correct' && <CheckIcon size={14} color="var(--green)" />}
                                        {bar.status === 'wrong'   && <XIcon     size={14} color="var(--red)" />}
                                        {bar.status === 'skipped' && <SkipIcon  size={12} color="var(--text-2)" />}
                                    </div>

                                    {bar.status !== 'empty' ? (
                                        <div className="attempt-text">
                                            <span className="attempt-track-name">{bar.trackName}</span>
                                            {bar.trackArtist && (
                                                <span className="attempt-track-artist">{bar.trackArtist}</span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className={`attempt-duration ${isCurrent ? 'is-current' : ''}`}>
                                            {bar.duration}s
                                        </span>
                                    )}

                                    {bar.status === 'correct' && (
                                        <span className="attempt-points">+{bar.points}</span>
                                    )}
                                    {bar.status === 'empty' && isCurrent && (
                                        <span className="attempt-hint">{bar.points} pts</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Timeline */}
                <div className="timeline-section">
                    <div className="timeline-cursor" style={{ left: `${getTimelineLeft()}%` }}>
                        <span className="timeline-cursor-label">{currentDuration}s</span>
                    </div>
                    <div className="timeline-track">
                        {DURATIONS.map((dur, i) => {
                            const width = (dur / TOTAL_DURATION) * 100;
                            const isDone    = i < guessCount;
                            const isCurrent = i === guessCount && gameState === 'playing';
                            let segClass = 'timeline-seg';
                            if (isDone) segClass += ' seg-done';
                            else if (isCurrent) segClass += ' seg-active';

                            return (
                                <div key={i} className={segClass} style={{ width: `${width}%` }}>
                                    {isPlaying && isCurrent && (
                                        <div className="timeline-seg-fill" style={{ width: `${playProgress * 100}%` }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Play button */}
                <div className="player-section">
                    <button
                        className={`play-btn${isPlaying ? ' is-playing' : ''}`}
                        onClick={playSnippet}
                        disabled={isPlaying || gameState !== 'playing'}
                        title={isPlaying ? 'Playing…' : 'Play snippet (Space)'}
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
                    {error && <p className="player-error">{error}</p>}
                </div>

                {/* Result section */}
                {gameState !== 'playing' && (
                    <div className="result-section">
                        {/* Verdict badge */}
                        <div className={`result-verdict ${gameState}`}>
                            {gameState === 'won' ? (
                                <><CheckIcon size={13} color="var(--green)" /> +{pointsEarned} points</>
                            ) : (
                                <><XIcon size={13} color="var(--red)" /> Better luck next time</>
                            )}
                        </div>

                        {/* Track reveal */}
                        <div className="track-reveal">
                            {currentTrack.album?.images?.[0] && (
                                <img
                                    src={currentTrack.album.images[0].url}
                                    alt={`${currentTrack.name} album art`}
                                    className={`album-art ${gameState}`}
                                />
                            )}
                            <div className="reveal-info">
                                <h3 className="reveal-title">{currentTrack.name}</h3>
                                <p className="reveal-artist">
                                    {currentTrack.artists.map(a => a.name).join(', ')}
                                </p>
                                {isContinuousPlay && (
                                    <div className="now-playing">
                                        <div className="np-bars" aria-hidden="true">
                                            <span /><span /><span />
                                        </div>
                                        Now Playing
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Next / Final */}
                        {isGameOver ? (
                            <div className="final-card">
                                <h2 className="final-heading">Game Over</h2>
                                <p className="final-sub">
                                    {correctAnswers === totalQuestions + 1
                                        ? 'Perfect — you got them all!'
                                        : `${correctAnswers} of ${totalQuestions + 1} songs guessed correctly`}
                                </p>
                                <div className="stats-row">
                                    <div className="stat-cell">
                                        <span className="stat-num">{score}</span>
                                        <span className="stat-label">Points</span>
                                    </div>
                                    <div className="stat-cell">
                                        <span className="stat-num">{correctAnswers}/{totalQuestions + 1}</span>
                                        <span className="stat-label">Correct</span>
                                    </div>
                                    <div className="stat-cell">
                                        <span className="stat-num">
                                            {Math.round((correctAnswers / (totalQuestions + 1)) * 100)}%
                                        </span>
                                        <span className="stat-label">Accuracy</span>
                                    </div>
                                </div>
                                <button className="play-again-btn" onClick={onExit}>
                                    Play Again
                                </button>
                            </div>
                        ) : (
                            <button className="next-btn" onClick={handleNextSong}>
                                Next Song <ArrowRightIcon size={16} />
                            </button>
                        )}
                    </div>
                )}

                {/* Guess input */}
                {gameState === 'playing' && (
                    <div className="guess-row">
                        <SongInput provider={provider} token={token} onGuess={handleGuess} />
                        <button className="skip-btn" onClick={handleSkip} title="Skip this attempt">
                            <SkipIcon size={14} />
                            Skip
                        </button>
                    </div>
                )}
            </main>

            {/* Keyboard hints */}
            <footer className="key-hints" aria-label="Keyboard shortcuts">
                <span className="key-hint"><kbd>Space</kbd> Play</span>
                <span className="key-hint"><kbd>Enter</kbd> Next song</span>
            </footer>
        </div>
    );
};

export default Game;
