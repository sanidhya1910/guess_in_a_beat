import { CheckIcon, CrownSimpleIcon, HourglassMediumIcon, WifiSlashIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { REACTIONS, type Reaction, type RoomPlayer, type RoomView } from '../lib/room-protocol';
import { formatSeconds } from '../lib/scoring';
import { avatarColor } from './room-utils';

export function Avatar({ player, size = 36 }: { player: Pick<RoomPlayer, 'name' | 'hue'>; size?: number }) {
    return (
        <span className="avatar" style={{ width: size, height: size, background: avatarColor(player.hue), fontSize: size * 0.44 }} aria-hidden="true">
            {[...player.name][0]?.toUpperCase() ?? '?'}
        </span>
    );
}

interface PlayerListProps {
    room: RoomView;
    me: string;
    /** Show each player's progress on the current song. */
    ladder?: number[];
    compact?: boolean;
}

export function PlayerList({ room, me, ladder, compact }: PlayerListProps) {
    const round = room.round;
    const players = [...room.players].sort((a, b) => b.score - a.score || Number(b.connected) - Number(a.connected));
    return (
        <ul className={`players${compact ? ' players--compact' : ''}`} aria-label="Players">
            {players.map((p) => {
                const pr = round?.players[p.id];
                let status: ReactNode = null;
                if (ladder && round && room.phase === 'round' && round.step >= 0) {
                    if (pr?.solvedStep !== undefined) {
                        status = (
                            <span className="player-status is-solved">
                                <CheckIcon size={13} weight="bold" /> {formatSeconds(ladder[pr.solvedStep])}
                            </span>
                        );
                    } else if (pr?.doneStep === round.step) {
                        status = (
                            <span className="player-status is-waiting">
                                <HourglassMediumIcon size={13} weight="fill" /> waiting
                            </span>
                        );
                    } else if (pr?.marks.length) {
                        status = <span className="player-status">{pr.marks.length} tried</span>;
                    }
                }
                return (
                    <li key={p.id} className={`player-row${p.connected ? '' : ' is-offline'}${p.id === me ? ' is-me' : ''}`}>
                        <Avatar player={p} size={compact ? 28 : 36} />
                        <span className="player-name">
                            {p.name}
                            {p.id === me && <span className="player-you">you</span>}
                            {p.host && <CrownSimpleIcon size={14} weight="fill" className="player-crown" aria-label="host" />}
                            {!p.connected && <WifiSlashIcon size={14} aria-label="offline" />}
                        </span>
                        {status}
                        <span className="player-score mono">{p.score}</span>
                    </li>
                );
            })}
        </ul>
    );
}

export interface FloatingReaction {
    id: number;
    emoji: Reaction;
    name: string;
    hue: number;
    /** 0..1 across the screen. */
    x: number;
}

export function ReactionBar({ onReact, raised }: { onReact(emoji: Reaction): void; raised?: boolean }) {
    return (
        <div className={`reactions${raised ? ' reactions--raised' : ''}`} role="group" aria-label="Send a reaction">
            {REACTIONS.map((emoji) => (
                <button key={emoji} type="button" className="reaction-btn" onClick={() => onReact(emoji)}>
                    {emoji}
                </button>
            ))}
        </div>
    );
}

export function ReactionLayer({ items }: { items: FloatingReaction[] }) {
    return (
        <div className="reaction-layer" aria-hidden="true">
            {items.map((r) => (
                <span key={r.id} className="reaction-float" style={{ left: `${8 + r.x * 84}%` }}>
                    <span className="reaction-emoji">{r.emoji}</span>
                    <span className="reaction-name" style={{ color: avatarColor(r.hue) }}>
                        {r.name}
                    </span>
                </span>
            ))}
        </div>
    );
}
