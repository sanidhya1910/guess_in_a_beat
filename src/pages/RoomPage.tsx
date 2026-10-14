import { ArrowRightIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useFocusMode, useUi } from '../app/ui-context';
import { audio } from '../lib/audio';
import { Link } from '../lib/Link';
import { profileStore, useRoom } from '../lib/room-client';
import { cleanName, isRoomCode, MAX_NAME, normalizeCode, type Reaction } from '../lib/room-protocol';
import { navigate, useLocation } from '../lib/router';
import { settingsStore } from '../lib/state';
import { useStore } from '../lib/store';
import { Lobby } from '../room/Lobby';
import { ReactionBar, ReactionLayer, type FloatingReaction } from '../room/parts';
import { RoomGame } from '../room/RoomGame';
import { RoomResults } from '../room/RoomResults';

export default function RoomPage({ params }: { params: Record<string, string> }) {
    const code = normalizeCode(params.code ?? '');
    const profile = useStore(profileStore);
    const [joined, setJoined] = useState(false);
    const [name, setName] = useState(profile.name);

    if (!isRoomCode(code)) return <RoomMessage title="That's not a room code" body="Room codes are four letters and numbers." />;

    // Always ask before joining: the click is also what lets the browser play
    // the clips that start on their own later.
    if (!joined) {
        const join = (e: FormEvent) => {
            e.preventDefault();
            const clean = cleanName(name);
            if (!clean) return;
            profileStore.set({ name: clean });
            audio.unlock();
            setJoined(true);
        };
        return (
            <section className="page room-gate">
                <form className="setup-panel" onSubmit={join}>
                    <p className="setup-kicker">
                        <UsersThreeIcon size={16} weight="fill" /> Room <span className="mono">{code}</span>
                    </p>
                    <h1 className="setup-title">Join the game</h1>
                    <label className="field">
                        <span className="field-label">Your name</span>
                        <input
                            className="input input--lg"
                            value={name}
                            maxLength={MAX_NAME}
                            autoComplete="nickname"
                            placeholder="What should we call you?"
                            autoFocus={!name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </label>
                    <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={!cleanName(name)} autoFocus={!!name}>
                        Join room <ArrowRightIcon size={18} weight="bold" />
                    </button>
                    <p className="field-hint">Turn your sound on. Clips play for everyone at the same moment.</p>
                </form>
            </section>
        );
    }

    return <RoomSession code={code} name={cleanName(name)} />;
}

function RoomMessage({ title, body }: { title: string; body: string }) {
    return (
        <div className="page page-message">
            <h1>{title}</h1>
            <p>{body}</p>
            <Link to="/party" className="btn btn--primary">
                Start or join a room
            </Link>
        </div>
    );
}

function RoomSession({ code, name }: { code: string; name: string }) {
    const { toast } = useUi();
    const { query } = useLocation();
    const { region } = useStore(settingsStore);
    const me = profileStore.get().id;
    const [feedback, setFeedback] = useState<{ text: string; key: string }>({ text: '', key: '' });
    const [floating, setFloating] = useState<FloatingReaction[]>([]);
    const reactionId = useRef(0);
    const roomRef = useRef<ReturnType<typeof useRoom>['room']>(null);

    const onReact = useCallback((player: string, emoji: Reaction) => {
        const p = roomRef.current?.players.find((x) => x.id === player);
        const id = ++reactionId.current;
        setFloating((list) => [...list.slice(-11), { id, emoji, name: p?.name ?? '', hue: p?.hue ?? 0, x: Math.random() }]);
        window.setTimeout(() => setFloating((list) => list.filter((r) => r.id !== id)), 2600);
    }, []);

    const { status, room, pool, offset, send } = useRoom(code, name, {
        onReact,
        onVerdict: (verdict, points) => {
            const r = roomRef.current?.round;
            const key = r ? `${r.index}:${r.step}` : '';
            if (verdict === 'correct') toast(`Correct! +${points}`);
            setFeedback({
                key,
                text: verdict === 'close' ? 'So close: right artist or title. Sit tight for the next clip.' : verdict === 'wrong' ? 'Not that one. Sit tight for the next clip.' : '',
            });
        },
        onError: toast,
    });
    useEffect(() => {
        roomRef.current = room;
    }, [room]);

    useFocusMode(!!room && room.phase !== 'lobby');

    const leave = () => {
        audio.stop();
        navigate('/party');
    };

    if (status === 'missing') return <RoomMessage title={`Room ${code} doesn't exist`} body="It may have closed after everyone left. Start a new one." />;
    if (status === 'full') return <RoomMessage title="This room is full" body="Ask the host to start a new room, or make your own." />;
    if (!room) {
        return (
            <div className="page page-loading">
                <span className="spinner spinner--lg" aria-label="Connecting to the room" />
            </div>
        );
    }

    const r = room.round;
    const currentFeedback = r && feedback.key === `${r.index}:${r.step}` ? feedback.text : '';

    return (
        <>
            {status === 'reconnecting' && (
                <p className="room-banner" role="status">
                    Reconnecting...
                </p>
            )}
            {room.phase === 'lobby' && <Lobby room={room} me={me} send={send} initialPack={query.get('pack') ?? undefined} />}
            {(room.phase === 'round' || room.phase === 'reveal') && r && (
                <RoomGame room={room} me={me} offset={offset} pool={pool} send={send} feedback={currentFeedback} country={region} onLeave={leave} />
            )}
            {room.phase === 'finished' && <RoomResults room={room} me={me} send={send} onLeave={leave} />}
            <ReactionBar raised={room.phase === 'lobby'} onReact={(emoji) => send({ t: 'react', emoji })} />
            <ReactionLayer items={floating} />
        </>
    );
}
