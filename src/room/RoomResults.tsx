import { ArrowCounterClockwiseIcon, GearSixIcon, SignOutIcon, TrophyIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useUi } from '../app/ui-context';
import { audio } from '../lib/audio';
import { artworkAt } from '../lib/itunes';
import type { ClientMessage, RoomView } from '../lib/room-protocol';
import { DIFFICULTIES, formatSeconds } from '../lib/scoring';
import { Avatar } from './parts';
import { startRoomGame } from './room-utils';

interface RoomResultsProps {
    room: RoomView;
    me: string;
    send(msg: ClientMessage): void;
    onLeave(): void;
}

const PLACES = ['1st', '2nd', '3rd'];

export function RoomResults({ room, me, send, onLeave }: RoomResultsProps) {
    const { toast } = useUi();
    const [starting, setStarting] = useState(false);
    const ranked = [...room.players].sort((a, b) => b.score - a.score);
    const isHost = ranked.some((p) => p.id === me && p.host);
    const ladder = DIFFICULTIES[room.settings.difficulty].ladder;
    const winner = ranked[0];
    const myPlace = ranked.findIndex((p) => p.id === me);

    const again = async () => {
        audio.unlock();
        setStarting(true);
        try {
            await startRoomGame(room, send);
        } catch (err) {
            toast((err as Error).message);
        } finally {
            setStarting(false);
        }
    };

    return (
        <section className="summary room-results page">
            <header className="summary-head">
                <p className="summary-kicker">{room.settings.source?.title}</p>
                <h1 className="room-results-title">
                    <TrophyIcon size={30} weight="fill" /> {winner && winner.score > 0 ? `${winner.id === me ? 'You win' : `${winner.name} wins`}!` : 'Game over'}
                </h1>
                {myPlace > 0 && <p className="setup-blurb">You finished {PLACES[myPlace] ?? `#${myPlace + 1}`}.</p>}
            </header>

            <ol className="podium">
                {ranked.slice(0, 3).map((p, i) => (
                    <li key={p.id} className={`podium-step podium-${i + 1}`}>
                        <Avatar player={p} size={i === 0 ? 64 : 48} />
                        <span className="podium-name">{p.name}</span>
                        <span className="podium-score mono">{p.score}</span>
                        <span className="podium-place">{PLACES[i]}</span>
                    </li>
                ))}
            </ol>

            {ranked.length > 3 && (
                <ol className="players" start={4}>
                    {ranked.slice(3).map((p, i) => (
                        <li key={p.id} className={`player-row${p.id === me ? ' is-me' : ''}`}>
                            <span className="mono podium-rank">{i + 4}</span>
                            <Avatar player={p} size={28} />
                            <span className="player-name">{p.name}</span>
                            <span className="player-score mono">{p.score}</span>
                        </li>
                    ))}
                </ol>
            )}

            <div className="summary-actions">
                {isHost ? (
                    <>
                        <button type="button" className="btn btn--primary btn--lg" onClick={again} disabled={starting}>
                            {starting ? <span className="spinner" aria-hidden="true" /> : <ArrowCounterClockwiseIcon size={18} weight="bold" />}
                            Play again
                        </button>
                        <button type="button" className="btn btn--secondary btn--lg" onClick={() => send({ t: 'lobby' })}>
                            <GearSixIcon size={18} /> Change pack
                        </button>
                    </>
                ) : (
                    <p className="lobby-waiting">
                        <span className="spinner" aria-hidden="true" /> The host can start another game
                    </p>
                )}
                <button type="button" className="btn btn--ghost btn--lg" onClick={onLeave}>
                    <SignOutIcon size={18} /> Leave
                </button>
            </div>

            <h2 className="room-recap-title">Song by song</h2>
            <ol className="summary-list">
                {room.history.map((h, i) => {
                    const first = h.solvers[0];
                    const firstPlayer = first && room.players.find((p) => p.id === first.id);
                    return (
                        <li key={i} className="room-recap-row">
                            <img src={artworkAt(h.song.artwork, 120)} alt="" loading="lazy" />
                            <span className="summary-song">
                                <span className="summary-song-title">{h.song.title}</span>
                                <span className="summary-song-artist">{h.song.artist}</span>
                            </span>
                            <span className={`summary-pts${firstPlayer ? '' : ' is-zero'}`}>
                                {firstPlayer ? (
                                    <>
                                        {firstPlayer.name} <span className="mono">{formatSeconds(ladder[first.step])}</span>
                                    </>
                                ) : (
                                    'Nobody'
                                )}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
