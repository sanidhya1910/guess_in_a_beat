import { CopyIcon, PlayIcon, ShareNetworkIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useUi } from '../app/ui-context';
import { CoverGrid } from '../components/CoverGrid';
import { Segmented } from '../components/Segmented';
import { audio } from '../lib/audio';
import { CATEGORY_LABELS, getPack, PACKS, randomPack } from '../lib/packs';
import { profileStore } from '../lib/room-client';
import { cleanName, MAX_NAME, ROUND_CHOICES, type ClientMessage, type RoomView } from '../lib/room-protocol';
import { DIFFICULTIES, formatSeconds } from '../lib/scoring';
import { shareText, siteUrl } from '../lib/share';
import type { Difficulty, PackCategory } from '../lib/types';
import { PlayerList } from './parts';
import { startRoomGame } from './room-utils';

interface LobbyProps {
    room: RoomView;
    me: string;
    send(msg: ClientMessage): void;
    /** Pack to preselect when this player created the room from a pack page. */
    initialPack?: string;
}

const CATEGORIES: PackCategory[] = ['charts', 'decades', 'genres'];

export function Lobby({ room, me, send, initialPack }: LobbyProps) {
    const { toast } = useUi();
    const isHost = room.players.find((p) => p.id === me)?.host ?? false;
    const host = room.players.find((p) => p.host);
    const [starting, setStarting] = useState(false);
    const [name, setName] = useState(() => room.players.find((p) => p.id === me)?.name ?? profileStore.get().name);
    const choseDefault = useRef(false);
    const { settings } = room;
    const link = siteUrl(`/room/${room.code}`);

    // A new room starts with the pack it was created from, or a random one.
    useEffect(() => {
        if (!isHost || settings.source || choseDefault.current) return;
        choseDefault.current = true;
        const pack = getPack(initialPack ?? '') ?? randomPack();
        send({ t: 'settings', settings: { source: { id: pack.id, title: pack.title, covers: pack.covers.slice(0, 4) } } });
    }, [isHost, settings.source, initialPack, send]);

    const setPack = (id: string) => {
        const pack = getPack(id);
        if (pack) send({ t: 'settings', settings: { source: { id: pack.id, title: pack.title, covers: pack.covers.slice(0, 4) } } });
    };

    const invite = async () => {
        const outcome = await shareText(`Join my Name That Beat room: ${link}`);
        if (outcome === 'copied') toast('Invite link copied');
        else if (outcome === 'failed') toast(`Room code: ${room.code}`);
    };

    const start = async () => {
        audio.unlock();
        setStarting(true);
        try {
            await startRoomGame(room, send);
        } catch (err) {
            toast((err as Error).message || 'That pack would not load. Try another.');
        } finally {
            setStarting(false);
        }
    };

    const rename = () => {
        const clean = cleanName(name);
        if (!clean) return;
        profileStore.set({ name: clean });
        send({ t: 'rename', name: clean });
    };

    const ladder = DIFFICULTIES[settings.difficulty].ladder;
    const online = room.players.filter((p) => p.connected).length;

    return (
        <section className="lobby page">
            <div className="lobby-main">
                <div className="lobby-code-card">
                    <p className="field-label">Room code</p>
                    <p className="lobby-code mono" aria-label={`Room code ${[...room.code].join(' ')}`}>
                        {room.code}
                    </p>
                    <div className="lobby-invite">
                        <button type="button" className="btn btn--primary" onClick={invite}>
                            <ShareNetworkIcon size={18} weight="bold" /> Invite friends
                        </button>
                        <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() =>
                                navigator.clipboard?.writeText(link).then(
                                    () => toast('Link copied'),
                                    () => toast(link),
                                )
                            }
                        >
                            <CopyIcon size={18} /> Copy link
                        </button>
                    </div>
                </div>

                <div className="lobby-players">
                    <div className="list-head">
                        <h2>
                            Players <span className="mono">{online}</span>
                        </h2>
                    </div>
                    <PlayerList room={room} me={me} />
                    <label className="field lobby-name">
                        <span className="field-label">Your name</span>
                        <input
                            className="input"
                            value={name}
                            maxLength={MAX_NAME}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={rename}
                            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                        />
                    </label>
                </div>
            </div>

            <div className="setup-panel lobby-settings">
                {settings.source && <CoverGrid covers={settings.source.covers} size={160} className="lobby-covers" />}

                <div className="field">
                    <span className="field-label" id="lobby-pack">
                        Songs from
                    </span>
                    {isHost ? (
                        <select className="input select" aria-labelledby="lobby-pack" value={settings.source?.id ?? ''} onChange={(e) => setPack(e.target.value)}>
                            {!settings.source && <option value="">Choose a pack</option>}
                            {CATEGORIES.map((cat) => (
                                <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                                    {PACKS.filter((p) => p.category === cat).map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.title}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    ) : (
                        <p className="setup-locked">{settings.source?.title ?? 'The host is choosing'}</p>
                    )}
                </div>

                <div className="field">
                    <span className="field-label" id="lobby-diff">
                        Difficulty
                    </span>
                    {isHost ? (
                        <Segmented<Difficulty>
                            labelledBy="lobby-diff"
                            value={settings.difficulty}
                            options={Object.values(DIFFICULTIES).map((d) => ({ value: d.id, label: d.label }))}
                            onChange={(difficulty) => send({ t: 'settings', settings: { difficulty } })}
                        />
                    ) : (
                        <p className="setup-locked">{DIFFICULTIES[settings.difficulty].label}</p>
                    )}
                    <ol className="ladder ladder--inline" aria-label="Clip lengths">
                        {ladder.map((s, i) => (
                            <li key={i} className="mono">
                                {formatSeconds(s)}
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="field">
                    <span className="field-label" id="lobby-rounds">
                        Songs
                    </span>
                    {isHost ? (
                        <Segmented<number>
                            labelledBy="lobby-rounds"
                            value={settings.rounds}
                            options={ROUND_CHOICES.map((n) => ({ value: n, label: String(n) }))}
                            onChange={(rounds) => send({ t: 'settings', settings: { rounds } })}
                        />
                    ) : (
                        <p className="setup-locked">{settings.rounds} songs</p>
                    )}
                </div>

                {isHost ? (
                    <button type="button" className="btn btn--primary btn--lg btn--block" onClick={start} disabled={starting || !settings.source}>
                        {starting ? <span className="spinner" aria-hidden="true" /> : <PlayIcon size={18} weight="fill" />}
                        Start game
                    </button>
                ) : (
                    <p className="lobby-waiting">
                        <span className="spinner" aria-hidden="true" /> Waiting for {host?.name ?? 'the host'} to start
                    </p>
                )}
                <p className="field-hint">
                    Each clip plays for everyone at once. A wrong guess sits you out until the next, longer clip. Name it first for up to +30
                    bonus.
                </p>
            </div>
        </section>
    );
}
