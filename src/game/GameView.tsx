import { FastForwardIcon, FlagIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { useFocusMode, useUi } from '../app/ui-context';
import { audio, type Prepared } from '../lib/audio';
import { songKey } from '../lib/match';
import { DIFFICULTIES, formatSeconds, MAX_ATTEMPTS } from '../lib/scoring';
import type { Song } from '../lib/types';
import { AttemptList } from './AttemptList';
import { GuessInput } from './GuessInput';
import { PlayButton } from './PlayButton';
import { gameReducer, type GameAction, type GameState } from './reducer';
import { RevealCard } from './RevealCard';
import { Timeline } from './Timeline';

interface GameViewProps {
    title: string;
    initial: GameState;
    /** Songs offered as instant suggestions (the pack, the artist, ...). */
    pool: Song[];
    /** Storefront used for guess search. */
    country: string;
    /** Storefront the songs came from, used to refresh stale previews. */
    sourceCountry?: string;
    onExit(): void;
    onChange?(state: GameState): void;
    renderFinished(state: GameState): ReactNode;
    /** Swap in a spare when a song won't load (packs) instead of showing an error (daily). */
    dropUnplayable?: boolean;
    finishLabel?: string;
}

type Playing = 'snippet' | 'full' | null;

const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

const isTyping = (el: EventTarget | null) =>
    el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(el.tagName));

export function GameView({
    title,
    initial,
    pool,
    country,
    sourceCountry = 'us',
    onExit,
    onChange,
    renderFinished,
    dropUnplayable = true,
    finishLabel = 'See results',
}: GameViewProps) {
    const { toast } = useUi();
    const [state, dispatch] = useReducer(gameReducer, initial);
    const [prep, setPrep] = useState<{ id: number; ready?: Prepared; failed?: boolean }>({ id: -1 });
    const [playing, setPlaying] = useState<Playing>(null);
    const [retry, setRetry] = useState(0);
    const onChangeRef = useRef(onChange);

    useFocusMode(state.phase !== 'finished');

    const song: Song | undefined = state.queue[state.index];
    const difficulty = DIFFICULTIES[state.difficulty];
    const ladder = difficulty.ladder;
    const step = Math.min(state.attempts.length, MAX_ATTEMPTS - 1);
    const ready = song && prep.id === song.id ? prep.ready : undefined;
    const failed = !!song && prep.id === song.id && !!prep.failed;

    useEffect(() => {
        onChangeRef.current = onChange;
    });
    useEffect(() => {
        onChangeRef.current?.(state);
    }, [state]);

    // Load the current song (and warm up the next one).
    useEffect(() => {
        if (!song || state.phase === 'finished') return;
        let alive = true;
        audio
            .prepare(song, sourceCountry)
            .then((ready) => alive && setPrep({ id: song.id, ready }))
            .catch(() => {
                if (!alive) return;
                if (dropUnplayable) {
                    toast('Skipped a song that would not load');
                    dispatch({ type: 'drop' });
                } else {
                    setPrep({ id: song.id, failed: true });
                }
            });
        const next = state.queue[state.index + 1];
        if (next) audio.prepare(next, sourceCountry).catch(() => {});
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the song changes
    }, [song?.id, retry, state.phase === 'finished']);

    useEffect(() => () => audio.stop(), [state.index]);

    const endPlayback = (kind: Playing) => () => setPlaying((p) => (p === kind ? null : p));

    const playSnippet = (len: number) => {
        if (!ready) return;
        audio.playSnippet(ready, len, endPlayback('snippet'));
        setPlaying('snippet');
    };

    const onPlay = () => {
        audio.unlock();
        if (failed) {
            setRetry((r) => r + 1);
            setPrep({ id: -1 });
            return;
        }
        if (playing) {
            audio.stop();
            setPlaying(null);
            return;
        }
        playSnippet(ladder[step]);
    };

    const toggleFull = () => {
        audio.unlock();
        if (playing === 'full') {
            audio.stop();
            setPlaying(null);
        } else if (ready) {
            audio.playFull(ready, endPlayback('full'));
            setPlaying('full');
        }
    };

    const act = (action: GameAction) => {
        audio.unlock();
        const next = gameReducer(state, action);
        dispatch(action);
        audio.stop();
        setPlaying(null);
        if (next.phase === 'revealed' && state.phase === 'guessing' && ready) {
            audio.playFull(ready, endPlayback('full'));
            setPlaying('full');
        } else if (action.type === 'skip' && next.phase === 'guessing') {
            playSnippet(ladder[Math.min(next.attempts.length, MAX_ATTEMPTS - 1)]);
        }
    };

    // Keyboard: Space plays the clip, Enter moves on after a reveal.
    const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
    useEffect(() => {
        keyHandler.current = (e: KeyboardEvent) => {
            if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.code === 'Space' && state.phase === 'guessing') {
                e.preventDefault();
                onPlay();
            } else if (e.key === 'Enter' && state.phase === 'revealed') {
                e.preventDefault();
                act({ type: 'next' });
            }
        };
    });
    useEffect(() => {
        const listener = (e: KeyboardEvent) => keyHandler.current(e);
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, []);

    const guessed = useMemo(
        () => new Set(state.attempts.flatMap((a) => (a.kind === 'guess' ? [songKey(a.song)] : []))),
        [state.attempts],
    );

    if (state.phase === 'finished') return <>{renderFinished(state)}</>;

    if (!song) {
        return (
            <div className="game-empty page">
                <h1>No playable songs</h1>
                <p>None of these songs could be loaded right now. Try another pack in a moment.</p>
                <button type="button" className="btn btn--primary" onClick={onExit}>
                    Back
                </button>
            </div>
        );
    }

    const result = state.phase === 'revealed' ? state.results[state.results.length - 1] : undefined;
    const isLast = state.index + 1 >= state.rounds;
    const playState = failed ? 'error' : !ready ? 'loading' : playing === 'snippet' ? 'playing' : 'ready';
    const nextSkip = ladder[step + 1];

    return (
        <div className="game">
            <header className="game-bar">
                <button type="button" className="icon-btn" onClick={onExit} aria-label="Quit game">
                    <XIcon size={22} weight="bold" />
                </button>
                <div className="game-bar-title">
                    <span className="game-bar-name">{title}</span>
                    {state.rounds > 1 && (
                        <span className="game-bar-progress mono">
                            Song {state.index + 1} of {state.rounds}
                        </span>
                    )}
                </div>
                <div className="game-bar-score mono" aria-label={`Score ${state.score}`}>
                    {state.score}
                    <span>pts</span>
                </div>
            </header>

            {state.rounds > 1 && (
                <div className="game-dots" aria-hidden="true">
                    {Array.from({ length: state.rounds }, (_, i) => {
                        const r = state.results[i];
                        return <span key={i} className={r ? (r.won ? 'is-won' : 'is-lost') : i === state.index ? 'is-current' : ''} />;
                    })}
                </div>
            )}

            <div className="game-stage">
                <AttemptList attempts={state.attempts} ladder={ladder} guessing={state.phase === 'guessing'} />

                {state.phase === 'guessing' ? (
                    <div className="game-controls">
                        <Timeline ladder={ladder} step={step} playing={playing === 'snippet'} />
                        <PlayButton
                            state={playState}
                            onPress={onPlay}
                            label={
                                failed
                                    ? 'Try loading the song again'
                                    : playing
                                      ? 'Stop'
                                      : `Play ${formatSeconds(ladder[step])} of the song`
                            }
                        />
                        <p className="game-hint">
                            {failed
                                ? 'This song would not load. Tap to retry.'
                                : !ready
                                  ? 'Loading the song...'
                                  : `${isTouch ? 'Tap play' : 'Press play or Space'} to hear ${formatSeconds(ladder[step])}`}
                        </p>
                        <div className="game-guess">
                            <GuessInput pool={pool} exclude={guessed} country={country} onGuess={(s) => act({ type: 'guess', song: s })} />
                            <div className="game-guess-actions">
                                <button type="button" className="btn btn--secondary" onClick={() => act({ type: 'skip' })}>
                                    <FastForwardIcon size={16} weight="fill" />
                                    {nextSkip ? `Skip (+${formatSeconds(nextSkip - ladder[step])})` : 'Skip'}
                                </button>
                                <button type="button" className="btn btn--ghost" onClick={() => act({ type: 'giveUp' })}>
                                    <FlagIcon size={16} weight="fill" /> Give up
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    result && (
                        <RevealCard
                            key={state.index}
                            song={song}
                            won={result.won}
                            tries={result.attempts.length}
                            points={result.points}
                            playing={playing === 'full'}
                            canPlay={!!ready}
                            onTogglePlay={toggleFull}
                            onNext={() => act({ type: 'next' })}
                            nextLabel={isLast ? finishLabel : 'Next song'}
                        />
                    )
                )}
            </div>
        </div>
    );
}
