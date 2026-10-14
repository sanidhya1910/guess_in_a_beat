import { ArrowRightIcon, FastForwardIcon, PauseIcon, PlayIcon, SignOutIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GuessInput } from '../game/GuessInput';
import { PlayButton } from '../game/PlayButton';
import { Timeline } from '../game/Timeline';
import { audio, type Prepared } from '../lib/audio';
import { artworkAt } from '../lib/itunes';
import { songKey } from '../lib/match';
import type { Clip, ClientMessage, PoolSong, RoomView } from '../lib/room-protocol';
import { DIFFICULTIES, formatSeconds, MAX_ATTEMPTS } from '../lib/scoring';
import type { Song } from '../lib/types';
import { Avatar, PlayerList } from './parts';
import { useServerNow } from './room-utils';

interface RoomGameProps {
    room: RoomView;
    me: string;
    offset: number;
    pool: PoolSong[];
    send(msg: ClientMessage): void;
    /** Last verdict on one of this player's guesses. */
    feedback: string;
    country: string;
    onLeave(): void;
}

/** A stand-in song for the audio engine: the room never says which song it is. */
const clipSong = (clip: Clip): Song => ({ id: clip.key, title: '', artist: '', album: '', artwork: '', preview: clip.preview });

const isTyping = (el: EventTarget | null) =>
    el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(el.tagName));

function useClip(clip: Clip | undefined): Prepared | undefined {
    const [ready, setReady] = useState<{ key: string; prepared: Prepared }>();
    const sig = clip ? `${clip.key}:${clip.videos.map((v) => v.id).join(',')}` : '';
    useEffect(() => {
        if (!clip) return;
        let alive = true;
        audio
            .prepare(clipSong(clip), 'us', clip.videos)
            .then((prepared) => alive && setReady({ key: sig, prepared }))
            .catch(() => {});
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the clip or its videos change
    }, [sig]);
    // Keep playing the preview-only version while a YouTube upgrade loads.
    return ready && clip && ready.key.startsWith(`${clip.key}:`) ? ready.prepared : undefined;
}

export function RoomGame({ room, me, offset, pool, send, feedback, country, onLeave }: RoomGameProps) {
    const round = room.round!;
    const ladder = DIFFICULTIES[room.settings.difficulty].ladder;
    const now = useServerNow(offset);
    const ready = useClip(round.clip);
    const [playing, setPlaying] = useState<'snippet' | 'full' | null>(null);
    const [guessed, setGuessed] = useState<{ round: number; keys: Set<string> }>({ round: -1, keys: new Set() });
    const played = useRef('');
    const mine = round.players[me];
    const solved = mine?.solvedStep !== undefined;
    const sittingOut = mine?.doneStep === round.step;
    const revealed = room.phase === 'reveal';
    const step = Math.max(0, round.step);

    // Warm up the next song while this one plays.
    useEffect(() => {
        const next = round.nextClip;
        if (next) audio.prepare(clipSong(next), 'us', next.videos).catch(() => {});
    }, [round.nextClip]);

    const playSnippet = () => {
        if (!ready || round.step < 0) return;
        audio.playSnippet(ready, ladder[round.step], () => setPlaying((p) => (p === 'snippet' ? null : p)));
        setPlaying('snippet');
    };

    // Each new clip plays for everyone as soon as the room moves to it.
    useEffect(() => {
        if (room.phase !== 'round' || round.step < 0 || !ready) return;
        const tag = `${round.index}:${round.step}`;
        if (played.current === tag) return;
        played.current = tag;
        // Joined (or reconnected) long after the clip played: let them press play.
        if (Date.now() + offset - round.stepStartedAt > ladder[round.step] * 1000 + 1500) return;
        playSnippet();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per clip
    }, [room.phase, round.index, round.step, ready]);

    // The reveal plays the familiar part of the song.
    useEffect(() => {
        if (!revealed) return;
        audio.stop();
        if (ready) {
            audio.playFull(ready, () => setPlaying((p) => (p === 'full' ? null : p)));
            setPlaying('full');
        }
        return () => {
            audio.stop();
            setPlaying(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once per reveal
    }, [revealed, round.index]);

    useEffect(() => () => audio.stop(), [round.index]);

    // Space replays the current clip.
    const replayRef = useRef(playSnippet);
    useEffect(() => {
        replayRef.current = playSnippet;
    });
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code !== 'Space' || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
            e.preventDefault();
            replayRef.current();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const poolSongs = useMemo<Song[]>(() => pool.map((p) => ({ album: '', preview: '', ...p })), [pool]);
    const exclude = guessed.round === round.index ? guessed.keys : new Set<string>();

    const guess = (song: Song) => {
        audio.unlock();
        send({ t: 'guess', song: { id: song.id, title: song.title, artist: song.artist } });
        setGuessed({ round: round.index, keys: new Set([...exclude, songKey(song)]) });
    };

    const me_ = room.players.find((p) => p.id === me);
    const isHost = !!me_?.host;
    const stepTotal = round.stepEndsAt - round.stepStartedAt;
    const stepLeft = Math.max(0, round.stepEndsAt - now);

    return (
        <div className="game room-game">
            <header className="game-bar">
                <button type="button" className="icon-btn" onClick={onLeave} aria-label="Leave room">
                    <SignOutIcon size={22} weight="bold" />
                </button>
                <div className="game-bar-title">
                    <span className="game-bar-name">{room.settings.source?.title ?? 'Room'}</span>
                    <span className="game-bar-progress mono">
                        Song {round.index + 1} of {round.total} · {room.code}
                    </span>
                </div>
                <div className="game-bar-score mono" aria-label={`Your score ${me_?.score ?? 0}`}>
                    {me_?.score ?? 0}
                    <span>pts</span>
                </div>
            </header>

            <div className="game-stage">
                {revealed ? (
                    <RoomReveal
                        room={room}
                        me={me}
                        ladder={ladder}
                        now={now}
                        isHost={isHost}
                        playing={playing === 'full'}
                        canPlay={!!ready}
                        onTogglePlay={() => {
                            if (playing === 'full') {
                                audio.stop();
                                setPlaying(null);
                            } else if (ready) {
                                audio.playFull(ready, () => setPlaying(null));
                                setPlaying('full');
                            }
                        }}
                        onNext={() => send({ t: 'next' })}
                    />
                ) : round.step < 0 ? (
                    <div className="room-countdown" aria-live="polite">
                        <p className="setup-kicker">Song {round.index + 1}</p>
                        <p className="room-countdown-num mono">{Math.max(1, Math.ceil(stepLeft / 1000))}</p>
                        <p className="game-hint">{ready ? 'Get ready...' : 'Loading the song...'}</p>
                    </div>
                ) : (
                    <div className="game-controls">
                        <div className="room-step">
                            <span className="mono">
                                Clip {step + 1} of {MAX_ATTEMPTS} · {formatSeconds(ladder[step])}
                            </span>
                            <span className="mono">{Math.ceil(stepLeft / 1000)}s</span>
                        </div>
                        <div className="room-step-bar" aria-hidden="true">
                            <div style={{ transform: `scaleX(${stepTotal ? stepLeft / stepTotal : 0})` }} />
                        </div>
                        <Timeline ladder={ladder} step={step} playing={playing === 'snippet'} />
                        <PlayButton
                            state={!ready ? 'loading' : playing === 'snippet' ? 'playing' : 'ready'}
                            onPress={() => {
                                audio.unlock();
                                if (playing) {
                                    audio.stop();
                                    setPlaying(null);
                                } else playSnippet();
                            }}
                            label={playing ? 'Stop' : `Replay ${formatSeconds(ladder[step])}`}
                        />
                        <p className="game-hint" aria-live="polite">
                            {solved
                                ? `You got it! +${mine?.points ?? 0}. Waiting for the others.`
                                : sittingOut
                                  ? feedback || 'Sitting this clip out. A longer one is coming.'
                                  : feedback || 'Know it? Type it in. Space replays the clip.'}
                        </p>
                        {!solved && (
                            <div className="game-guess">
                                {sittingOut ? (
                                    <p className="room-wait">Next clip in {Math.ceil(stepLeft / 1000)}s</p>
                                ) : (
                                    <>
                                        <GuessInput pool={poolSongs} exclude={exclude} country={country} onGuess={guess} />
                                        <div className="game-guess-actions">
                                            <button type="button" className="btn btn--secondary" onClick={() => send({ t: 'pass' })}>
                                                <FastForwardIcon size={16} weight="fill" />
                                                {step + 1 < MAX_ATTEMPTS ? 'Pass, I need more' : 'Pass'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <PlayerList room={room} me={me} ladder={ladder} compact />
            </div>
        </div>
    );
}

interface RoomRevealProps {
    room: RoomView;
    me: string;
    ladder: number[];
    now: number;
    isHost: boolean;
    playing: boolean;
    canPlay: boolean;
    onTogglePlay(): void;
    onNext(): void;
}

function RoomReveal({ room, me, ladder, now, isHost, playing, canPlay, onTogglePlay, onNext }: RoomRevealProps) {
    const round = room.round!;
    const song = round.answer!;
    const art = artworkAt(song.artwork, 600);
    const solvers = Object.entries(round.players)
        .filter(([, pr]) => pr.solvedStep !== undefined)
        .sort(([, a], [, b]) => (a.rank ?? 0) - (b.rank ?? 0));
    const isLast = round.index + 1 >= round.total;
    const left = Math.max(0, Math.ceil(((room.nextAt ?? now) - now) / 1000));
    const mine = round.players[me];

    return (
        <section className={`reveal room-reveal ${mine?.solvedStep !== undefined ? 'is-won' : 'is-lost'}`} aria-live="polite">
            <div className="reveal-art">
                <img className="reveal-glow" src={art} alt="" aria-hidden="true" />
                <img className="art" src={art} alt={`Cover of ${song.album || song.title}`} />
            </div>
            <div className="reveal-body">
                <p className="reveal-verdict">{mine?.solvedStep !== undefined ? `You got it · +${mine.points}` : 'The song was'}</p>
                <h2 className="reveal-title">{song.title}</h2>
                <p className="reveal-artist">{song.artist}</p>
                <div className="reveal-player">
                    <button type="button" className="reveal-play" onClick={onTogglePlay} disabled={!canPlay} aria-label={playing ? 'Pause' : 'Play'}>
                        {playing ? <PauseIcon size={18} weight="fill" /> : <PlayIcon size={18} weight="fill" />}
                    </button>
                    <span className="field-hint">{playing ? 'Playing the preview' : 'Preview'}</span>
                </div>
            </div>

            <ol className="room-solvers">
                {solvers.length === 0 && <li className="room-solvers-none">Nobody got this one.</li>}
                {solvers.map(([id, pr]) => {
                    const p = room.players.find((x) => x.id === id);
                    if (!p) return null;
                    return (
                        <li key={id}>
                            <Avatar player={p} size={28} />
                            <span className="player-name">{p.name}</span>
                            <span className="mono room-solver-time">{formatSeconds(ladder[pr.solvedStep!])}</span>
                            <span className="mono room-solver-pts">+{pr.points}</span>
                        </li>
                    );
                })}
            </ol>

            {isHost ? (
                <button type="button" className="btn btn--primary btn--lg btn--block reveal-next" onClick={onNext}>
                    {isLast ? 'See results' : 'Next song'} <span className="mono">({left})</span> <ArrowRightIcon size={18} weight="bold" />
                </button>
            ) : (
                <p className="room-wait">{isLast ? 'Results' : 'Next song'} in {left}s</p>
            )}
        </section>
    );
}
