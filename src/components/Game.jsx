import React, { useState, useRef, useEffect } from 'react';
import { playTrack, pausePlayback } from '../services/spotify';
import SongInput from './SongInput';

const DURATIONS = [0.1, 0.5, 1, 2, 5, 10];
const POINTS = [6, 5, 4, 3, 2, 1]; // Points for guessing at each duration
const MAX_ATTEMPTS = 6;

const Game = ({ tracks, token, onExit }) => {
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [guessCount, setGuessCount] = useState(0);
    const [gameState, setGameState] = useState('playing'); // playing, won, lost
    const [guesses, setGuesses] = useState([]);
    const [message, setMessage] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [isContinuousPlay, setIsContinuousPlay] = useState(false);
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

    // Normalize song name for comparison (remove special editions, remasters, etc.)
    const normalizeName = (name) => {
        return name
            .toLowerCase()
            .replace(/\s*[-–—]\s*(remaster(ed)?|deluxe|special|edition|version|live|acoustic|remix|radio edit|single|mix|mono|stereo|anniversary|extended|bonus|explicit|clean).*$/i, '')
            .replace(/\s*\((remaster(ed)?|deluxe|special|edition|version|live|acoustic|remix|radio edit|single|mix|mono|stereo|anniversary|extended|bonus|explicit|clean|feat\.?.*|ft\.?.*|\d{4})\)/gi, '')
            .replace(/\s*\[(remaster(ed)?|deluxe|special|edition|version|live|acoustic|remix|radio edit|single|mix|mono|stereo|anniversary|extended|bonus|explicit|clean|feat\.?.*|ft\.?.*|\d{4})\]/gi, '')
            .replace(/[''`]/g, "'")
            .replace(/[""]/g, '"')
            .trim();
    };

    // Check if the guessed track matches the current track
    const isCorrectGuess = (guessedTrack) => {
        // Exact ID match
        if (guessedTrack.id === currentTrack.id) return true;
        
        // Normalize both names
        const guessedName = normalizeName(guessedTrack.name);
        const correctName = normalizeName(currentTrack.name);
        
        // Get primary artists (first artist is usually the main one)
        const guessedArtist = guessedTrack.artists[0]?.name.toLowerCase().trim();
        const correctArtist = currentTrack.artists[0]?.name.toLowerCase().trim();
        
        // Check if names match and at least one artist matches
        if (guessedName === correctName && guessedArtist === correctArtist) {
            return true;
        }
        
        // Check if any artists overlap (for collaborations)
        const guessedArtists = guessedTrack.artists.map(a => a.name.toLowerCase().trim());
        const correctArtists = currentTrack.artists.map(a => a.name.toLowerCase().trim());
        const hasMatchingArtist = guessedArtists.some(a => correctArtists.includes(a));
        
        if (guessedName === correctName && hasMatchingArtist) {
            return true;
        }
        
        return false;
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (progressRef.current) cancelAnimationFrame(progressRef.current);
        };
    }, []);

    // Play song continuously when game ends (won or lost)
    const playContinuously = async () => {
        if (!currentTrack) return;
        setIsContinuousPlay(true);
        try {
            await playTrack(token, currentTrack.uri);
        } catch (e) {
            console.error('Error playing continuously:', e);
        }
    };

    const playSnippet = async () => {
        if (isPlaying || !currentTrack) return;

        setIsPlaying(true);
        setError('');
        setPlayProgress(0);

        try {
            await playTrack(token, currentTrack.uri);

            // Animate progress bar
            const startTime = Date.now();
            const duration = currentDuration * 1000;
            const animateProgress = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
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
            }, duration);
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

    const handleGuess = async (guessedTrack) => {
        const isCorrect = isCorrectGuess(guessedTrack);

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
            // Play song continuously after correct guess
            await playContinuously();
        } else {
            const nextGuessCount = guessCount + 1;
            if (nextGuessCount >= DURATIONS.length) {
                setGuessCount(nextGuessCount);
                setGameState('lost');
                setMessage(`Game Over! The song was "${currentTrack.name}" by ${currentTrack.artists[0].name}`);
                // Play song continuously after reveal
                await playContinuously();
            } else {
                setGuessCount(nextGuessCount);
                setMessage(`❌ Wrong! Try again with ${DURATIONS[nextGuessCount]}s (${POINTS[nextGuessCount]} pts)`);
            }
        }
    };

    const handleSkip = async () => {
        const nextGuessCount = guessCount + 1;
        setGuesses([...guesses, { track: { name: 'Skipped', artists: [{ name: '' }] }, isCorrect: false, skipped: true }]);
        
        if (nextGuessCount >= DURATIONS.length) {
            setGuessCount(nextGuessCount);
            setGameState('lost');
            setMessage(`Game Over! The song was "${currentTrack.name}" by ${currentTrack.artists[0].name}`);
            // Play song continuously after reveal
            await playContinuously();
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
        // Play song continuously after giving up
        await playContinuously();
    };

    const handleNextSong = async () => {
        // Stop any currently playing music
        try {
            await pausePlayback(token);
        } catch (e) {
            console.log('Could not pause playback');
        }
        if (progressRef.current) cancelAnimationFrame(progressRef.current);
        setIsContinuousPlay(false);

        setTotalQuestions(totalQuestions + 1);

        if (currentTrackIndex < tracks.length - 1) {
            setCurrentTrackIndex(currentTrackIndex + 1);
            setGuessCount(0);
            setGameState('playing');
            setGuesses([]);
            setMessage('');
            setError('');
            setPlayProgress(0);
            setIsPlaying(false);
        } else {
            setMessage("🎊 You've finished all the songs!");
        }
    };

    // Build attempt bars for Songless-style UI
    const getAttemptBars = () => {
        const bars = [];
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const guess = guesses[i];
            let status = 'empty';
            let label = '';
            
            if (guess) {
                if (guess.isCorrect) {
                    status = 'correct';
                    label = `${guess.track.name} - ${guess.track.artists[0]?.name || ''}`;
                } else if (guess.skipped) {
                    status = 'skipped';
                    label = 'Skipped';
                } else {
                    status = 'wrong';
                    label = `${guess.track.name} - ${guess.track.artists[0]?.name || ''}`;
                }
            }
            
            bars.push({ status, label, duration: DURATIONS[i] });
        }
        return bars;
    };

    if (!currentTrack) return <div>No tracks available.</div>;

    const attemptBars = getAttemptBars();

    return (
        <div className="game-container songless-style">
            {/* Header */}
            <div className="header">
                <div className="header-left">
                    <button className="back-btn" onClick={onExit}>←</button>
                </div>
                <div className="header-center">
                    <h1 className="game-title">Guess in a Beat</h1>
                    <div className="header-stats">
                        <span className="stat">{score} pts</span>
                        <span className="stat">{currentTrackIndex + 1}/{tracks.length}</span>
                    </div>
                </div>
                <div className="header-right"></div>
            </div>

            {/* Attempt Bars */}
            <div className="attempt-bars">
                {attemptBars.map((bar, index) => (
                    <div 
                        key={index} 
                        className={`attempt-bar ${bar.status}`}
                    >
                        {bar.label}
                    </div>
                ))}
            </div>

            {/* Progress Timeline */}
            <div className="timeline-container">
                <div className="timeline-marker">
                    <span>{currentDuration} seconds</span>
                    <div className="marker-arrow">▼</div>
                </div>
                <div className="timeline">
                    {DURATIONS.map((duration, index) => {
                        const isActive = index < guessCount;
                        const isCurrent = index === guessCount && gameState === 'playing';
                        const width = (duration / DURATIONS.reduce((a, b) => a + b, 0)) * 100;
                        
                        return (
                            <div
                                key={index}
                                className={`timeline-segment ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                                style={{ width: `${width}%` }}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Play Button */}
            <div className="player-section">
                <button
                    className="play-button-large"
                    onClick={playSnippet}
                    disabled={isPlaying || gameState !== 'playing'}
                >
                    {isPlaying ? '⏸' : '▶'}
                </button>
                {error && <div className="error-message">{error}</div>}
            </div>

            {/* Next Button - Above Album Art when game ends */}
            {gameState !== 'playing' && (
                <div className="next-button-container">
                    {currentTrackIndex < tracks.length - 1 ? (
                        <button className="next-btn-large" onClick={handleNextSong}>
                            Next Song →
                        </button>
                    ) : (
                        <div className="final-score-mini">
                            <span>🎊 Complete! {score} pts | {correctAnswers}/{totalQuestions + 1}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Album Art Reveal */}
            {gameState !== 'playing' && (
                <div className="track-reveal">
                    {currentTrack.album?.images?.[0] && (
                        <img src={currentTrack.album.images[0].url} alt="Album Art" className="album-art" />
                    )}
                    <h3>{currentTrack.name}</h3>
                    <p>{currentTrack.artists.map(a => a.name).join(', ')}</p>
                    {isContinuousPlay && <p className="now-playing">🎵 Now Playing...</p>}
                </div>
            )}

            {/* Search Input */}
            {gameState === 'playing' && (
                <div className="input-section">
                    <SongInput token={token} onGuess={handleGuess} />
                    <button className="skip-btn-modern" onClick={handleSkip}>
                        Skip
                    </button>
                </div>
            )}
        </div>
    );
};

export default Game;
