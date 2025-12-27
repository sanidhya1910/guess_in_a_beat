import React, { useState, useRef, useEffect } from 'react';
import { playTrack, pausePlayback } from '../services/spotify';
import SongInput from './SongInput';

const DURATIONS = [0.1, 0.5, 1, 2, 5, 10];
const POINTS = [6, 5, 4, 3, 2, 1]; // Points for guessing at each duration

const Game = ({ tracks, token, onExit }) => {
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [guessCount, setGuessCount] = useState(0);
    const [gameState, setGameState] = useState('playing'); // playing, won, lost
    const [guesses, setGuesses] = useState([]);
    const [message, setMessage] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState('');
    const [score, setScore] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [playProgress, setPlayProgress] = useState(0);
    const timeoutRef = useRef(null);
    const progressRef = useRef(null);

    const currentTrack = tracks[currentTrackIndex];
    const currentDuration = DURATIONS[Math.min(guessCount, DURATIONS.length - 1)];
    const currentPoints = POINTS[Math.min(guessCount, POINTS.length - 1)];

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (progressRef.current) cancelAnimationFrame(progressRef.current);
        };
    }, []);

    const playSnippet = async () => {
        if (isPlaying || !currentTrack) return;

        setIsPlaying(true);
        setError('');
        setPlayProgress(0);

        try {
            await playTrack(token, currentTrack.uri);

            // Animate progress bar
            const startTime = Date.now();
            const animateProgress = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / (currentDuration * 1000), 1);
                setPlayProgress(progress);
                if (progress < 1) {
                    progressRef.current = requestAnimationFrame(animateProgress);
                }
            };
            progressRef.current = requestAnimationFrame(animateProgress);

            timeoutRef.current = setTimeout(async () => {
                try {
                    await pausePlayback(token);
                } catch (e) {
                    console.error('Error pausing:', e);
                }
                setIsPlaying(false);
                if (progressRef.current) cancelAnimationFrame(progressRef.current);
            }, currentDuration * 1000);
        } catch (e) {
            console.error('Error playing:', e);
            if (e.message && e.message.includes('NO_DEVICES')) {
                setError('No Spotify devices found. Please open Spotify on your computer or phone and try again.');
            } else if (e.response?.status === 403) {
                setError('Spotify Premium is required to control playback. Please upgrade to Premium.');
            } else if (e.response?.status === 404) {
                setError('No active Spotify device found. Please open Spotify and play any song briefly, then try again.');
            } else {
                setError('Failed to play. Make sure Spotify is open and active on a device.');
            }
            setIsPlaying(false);
        }
    };

    const handleGuess = (guessedTrack) => {
        const isCorrect = guessedTrack.id === currentTrack.id;

        const newGuess = {
            track: guessedTrack,
            isCorrect: isCorrect,
            points: isCorrect ? currentPoints : 0
        };

        setGuesses([...guesses, newGuess]);

        if (isCorrect) {
            setScore(score + currentPoints);
            setCorrectAnswers(correctAnswers + 1);
            setGameState('won');
            setMessage(`🎉 Correct! +${currentPoints} points!`);
        } else {
            const nextGuessCount = guessCount + 1;
            if (nextGuessCount >= DURATIONS.length) {
                setGuessCount(nextGuessCount);
                setGameState('lost');
                setMessage(`Game Over! The song was "${currentTrack.name}" by ${currentTrack.artists[0].name}`);
            } else {
                setGuessCount(nextGuessCount);
                setMessage(`❌ Wrong! Try again with ${DURATIONS[nextGuessCount]}s (${POINTS[nextGuessCount]} pts)`);
            }
        }
    };

    const handleSkip = () => {
        const nextGuessCount = guessCount + 1;
        setGuesses([...guesses, { track: { name: 'Skipped', artists: [{ name: '' }] }, isCorrect: false, skipped: true }]);
        
        if (nextGuessCount >= DURATIONS.length) {
            setGuessCount(nextGuessCount);
            setGameState('lost');
            setMessage(`Game Over! The song was "${currentTrack.name}" by ${currentTrack.artists[0].name}`);
        } else {
            setGuessCount(nextGuessCount);
            setMessage(`Skipped! Try with ${DURATIONS[nextGuessCount]}s (${POINTS[nextGuessCount]} pts)`);
        }
    };

    const handleGiveUp = async () => {
        // Stop any currently playing music
        try {
            await pausePlayback(token);
        } catch (e) {
            console.log('Could not pause playback');
        }
        if (progressRef.current) cancelAnimationFrame(progressRef.current);
        setIsPlaying(false);
        setGameState('lost');
        setMessage(`You gave up! The song was "${currentTrack.name}" by ${currentTrack.artists[0].name}`);
    };

    const handleNextSong = async () => {
        // Stop any currently playing music
        try {
            await pausePlayback(token);
        } catch (e) {
            console.log('Could not pause playback');
        }
        if (progressRef.current) cancelAnimationFrame(progressRef.current);

        setTotalQuestions(totalQuestions + 1);

        if (currentTrackIndex < tracks.length - 1) {
            setCurrentTrackIndex(currentTrackIndex + 1);
            setGuessCount(0);
            setGameState('playing');
            setGuesses([]);
            setMessage('');
            setError('');
            setPlayProgress(0);
        } else {
            setMessage("🎊 You've finished all the songs!");
        }
    };

    // Calculate cumulative duration up to current segment
    const getCumulativeWidth = (index) => {
        const total = DURATIONS.reduce((a, b) => a + b, 0);
        let cumulative = 0;
        for (let i = 0; i <= index; i++) {
            cumulative += DURATIONS[i];
        }
        return (cumulative / total) * 100;
    };

    if (!currentTrack) return <div>No tracks available.</div>;

    return (
        <div className="game-container">
            <div className="header">
                <h2>🎵 GuessInABeat</h2>
                <button className="exit-btn" onClick={onExit}>Exit Game</button>
            </div>

            {/* Score Board */}
            <div className="score-board">
                <div className="score-item">
                    <span className="score-label">Score</span>
                    <span className="score-value">{score}</span>
                </div>
                <div className="score-item">
                    <span className="score-label">Correct</span>
                    <span className="score-value">{correctAnswers}/{totalQuestions}</span>
                </div>
                <div className="score-item">
                    <span className="score-label">Song</span>
                    <span className="score-value">{currentTrackIndex + 1}/{tracks.length}</span>
                </div>
            </div>

            {/* Playbar with duration segments */}
            <div className="playbar-container">
                <div className="playbar">
                    {DURATIONS.map((duration, index) => {
                        const isActive = index <= guessCount;
                        const isCurrent = index === guessCount;
                        
                        return (
                            <div
                                key={index}
                                className={`playbar-segment ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                            >
                                <span className="segment-label">{duration}s</span>
                                <span className="segment-points">{POINTS[index]}pt</span>
                            </div>
                        );
                    })}
                    {/* Progress indicator */}
                    {isPlaying && (
                        <div 
                            className="playbar-progress" 
                            style={{ 
                                width: `${((guessCount + playProgress) / DURATIONS.length) * 100}%` 
                            }}
                        />
                    )}
                </div>
            </div>

            <div className="player-section">
                <button
                    className="play-button"
                    onClick={playSnippet}
                    disabled={isPlaying || gameState !== 'playing'}
                >
                    {isPlaying ? '🎵 Playing...' : `▶️ Play (${currentDuration}s)`}
                </button>
                <div className="points-hint">
                    {gameState === 'playing' && `Guess now for ${currentPoints} points!`}
                </div>
                {error && <div className="error-message">{error}</div>}
            </div>

            <div className="message-section">
                {message && <div className={`message ${gameState}`}>{message}</div>}
            </div>

            <div className="guesses-list">
                {guesses.map((g, i) => (
                    <div key={i} className={`guess-item ${g.isCorrect ? 'correct' : 'wrong'}`}>
                        {g.skipped ? '⏭️ Skipped' : (g.isCorrect ? `✅ +${g.points}pts` : '❌')} {g.track.name} {g.track.artists[0]?.name ? `- ${g.track.artists[0].name}` : ''}
                    </div>
                ))}
            </div>

            {gameState === 'playing' && (
                <>
                    <SongInput token={token} onGuess={handleGuess} />
                    <div className="action-buttons">
                        <button className="skip-btn" onClick={handleSkip}>
                            ⏭️ Skip
                        </button>
                        <button className="giveup-btn" onClick={handleGiveUp}>
                            🏳️ Give Up
                        </button>
                    </div>
                </>
            )}

            {gameState !== 'playing' && (
                <div className="game-over-controls">
                    <div className="track-reveal">
                        {currentTrack.album?.images?.[0] && (
                            <img src={currentTrack.album.images[0].url} alt="Album Art" className="album-art" />
                        )}
                        <h3>{currentTrack.name}</h3>
                        <p>{currentTrack.artists.map(a => a.name).join(', ')}</p>
                    </div>
                    {currentTrackIndex < tracks.length - 1 ? (
                        <button className="next-btn" onClick={handleNextSong}>Next Song →</button>
                    ) : (
                        <div className="final-score">
                            <h2>🎊 Game Complete!</h2>
                            <p>Final Score: <strong>{score}</strong> points</p>
                            <p>Correct: {correctAnswers} / {totalQuestions + 1}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Game;
