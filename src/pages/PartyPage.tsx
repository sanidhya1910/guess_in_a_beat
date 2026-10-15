import { ArrowRightIcon, LightningIcon, PlusIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { CoverGrid } from '../components/CoverGrid';
import { getPack, PACKS } from '../lib/packs';
import { createRoom, profileStore, roomExists } from '../lib/room-client';
import { cleanName, isRoomCode, MAX_NAME, MAX_PLAYERS, normalizeCode, ROOM_CODE_LENGTH } from '../lib/room-protocol';
import { navigate, useLocation } from '../lib/router';
import { useStore } from '../lib/store';

// Entry point for multiplayer: start a room or join one with a code.
export default function PartyPage() {
    const { query } = useLocation();
    const pack = getPack(query.get('pack') ?? '');
    const profile = useStore(profileStore);
    const [name, setName] = useState(profile.name);
    const [code, setCode] = useState(normalizeCode(query.get('code') ?? ''));
    const [busy, setBusy] = useState<'create' | 'join' | null>(null);
    const [error, setError] = useState('');

    const saveName = (): string | null => {
        const clean = cleanName(name);
        if (!clean) {
            setError('Pick a name first, so your friends know who is winning.');
            return null;
        }
        profileStore.set({ name: clean });
        return clean;
    };

    const create = async () => {
        if (!saveName()) return;
        setBusy('create');
        setError('');
        try {
            const room = await createRoom();
            navigate(`/room/${room}${pack ? `?pack=${pack.id}` : ''}`);
        } catch (err) {
            setError((err as Error).message);
            setBusy(null);
        }
    };

    const join = async (e: FormEvent) => {
        e.preventDefault();
        if (!saveName()) return;
        if (!isRoomCode(code)) {
            setError(`Room codes are ${ROOM_CODE_LENGTH} letters and numbers.`);
            return;
        }
        setBusy('join');
        setError('');
        const exists = await roomExists(code).catch(() => true);
        if (!exists) {
            setError(`There's no room ${code}. Check the code with your host.`);
            setBusy(null);
            return;
        }
        navigate(`/room/${code}`);
    };

    const covers = pack?.covers ?? PACKS.flatMap((p) => p.covers).filter((_, i) => i % 7 === 3);

    return (
        <section className="party page">
            <div className="party-hero">
                <CoverGrid covers={covers.slice(0, 4)} size={300} className="setup-covers" />
                <div className="setup-intro">
                    <p className="setup-kicker">
                        <UsersThreeIcon size={16} weight="fill" /> Multiplayer
                    </p>
                    <h1 className="setup-title">Play with friends</h1>
                    <p className="setup-blurb">
                        Everyone hears the same split second at the same time. Name it first for bonus points. Up to {MAX_PLAYERS} players,
                        on any device, no sign-up.
                    </p>
                    {pack && (
                        <p className="setup-meta">
                            <LightningIcon size={15} weight="fill" /> Starting with <strong>{pack.title}</strong>
                        </p>
                    )}
                </div>
            </div>

            <div className="setup-panel party-panel">
                <label className="field">
                    <span className="field-label">Your name</span>
                    <input
                        className="input input--lg"
                        value={name}
                        maxLength={MAX_NAME}
                        autoComplete="nickname"
                        placeholder="What should we call you?"
                        onChange={(e) => setName(e.target.value)}
                    />
                </label>

                <button type="button" className="btn btn--primary btn--lg btn--block" onClick={create} disabled={!!busy}>
                    {busy === 'create' ? <span className="spinner" aria-hidden="true" /> : <PlusIcon size={18} weight="bold" />}
                    Create a room
                </button>

                <div className="party-or" role="separator">
                    <span>or join one</span>
                </div>

                <form className="party-join" onSubmit={join}>
                    <input
                        className="input input--lg party-code-input mono"
                        value={code}
                        onChange={(e) => setCode(normalizeCode(e.target.value))}
                        placeholder="CODE"
                        aria-label="Room code"
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                        inputMode="text"
                    />
                    <button type="submit" className="btn btn--secondary btn--lg" disabled={!!busy || code.length < ROOM_CODE_LENGTH}>
                        {busy === 'join' ? <span className="spinner" aria-hidden="true" /> : <ArrowRightIcon size={18} weight="bold" />}
                        Join
                    </button>
                </form>

                {error && (
                    <p className="inline-error" role="alert">
                        {error}
                    </p>
                )}
            </div>
        </section>
    );
}
