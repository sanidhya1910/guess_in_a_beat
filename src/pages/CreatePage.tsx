import { ArrowDownIcon, ArrowUpIcon, LinkSimpleIcon, PlayIcon, TrashIcon } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useUi } from '../app/ui-context';
import { PlaylistImport } from '../components/PlaylistImport';
import { GuessInput } from '../game/GuessInput';
import { customPath, MAX_CUSTOM_SONGS, MIN_CUSTOM_SONGS } from '../lib/custom';
import { artworkAt } from '../lib/itunes';
import { songKey } from '../lib/match';
import { navigate } from '../lib/router';
import { siteUrl } from '../lib/share';
import { settingsStore } from '../lib/state';
import { createStore, useStore } from '../lib/store';
import type { Song } from '../lib/types';

// The draft lives in this browser only, so a half-built quiz survives a reload.
const draftStore = createStore<{ title: string; songs: Song[] }>('gib:draft', { title: '', songs: [] });

export default function CreatePage() {
    const { toast } = useUi();
    const { region } = useStore(settingsStore);
    const draft = useStore(draftStore);
    const chosen = useMemo(() => new Set(draft.songs.map(songKey)), [draft.songs]);
    const enough = draft.songs.length >= MIN_CUSTOM_SONGS;
    const path = customPath(draft.title, region, draft.songs.map((s) => s.id));

    const add = (song: Song) => {
        if (!song.preview) {
            toast('That song has no preview, so it cannot be played');
            return;
        }
        if (draft.songs.length >= MAX_CUSTOM_SONGS) {
            toast(`Challenges hold up to ${MAX_CUSTOM_SONGS} songs`);
            return;
        }
        draftStore.set((d) => ({ ...d, songs: [...d.songs, song] }));
    };

    const move = (i: number, dir: -1 | 1) =>
        draftStore.set((d) => {
            const songs = [...d.songs];
            const j = i + dir;
            if (j < 0 || j >= songs.length) return d;
            [songs[i], songs[j]] = [songs[j], songs[i]];
            return { ...d, songs };
        });

    /** Adds songs that aren't in the challenge yet, up to the limit, and returns how many were added. */
    const addMany = (songs: Song[]): number => {
        const before = draftStore.get().songs.length;
        draftStore.set((d) => {
            const keys = new Set(d.songs.map(songKey));
            const fresh: Song[] = [];
            for (const song of songs) {
                const key = songKey(song);
                if (!song.preview || keys.has(key)) continue;
                keys.add(key);
                fresh.push(song);
            }
            return { ...d, songs: [...d.songs, ...fresh].slice(0, MAX_CUSTOM_SONGS) };
        });
        return draftStore.get().songs.length - before;
    };

    const remove = (i: number) => draftStore.set((d) => ({ ...d, songs: d.songs.filter((_, k) => k !== i) }));

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(siteUrl(path));
            toast('Link copied. Send it to your friends.');
        } catch {
            toast('Could not copy the link');
        }
    };

    return (
        <section className="page create">
            <header className="list-head">
                <h1>Create a challenge</h1>
                <p>
                    Pick {MIN_CUSTOM_SONGS} to {MAX_CUSTOM_SONGS} songs, share the link, and compare scores.
                </p>
            </header>

            <div className="create-grid">
                <div className="create-form">
                    <div className="field">
                        <label className="field-label" htmlFor="create-title">
                            Challenge name
                        </label>
                        <input
                            id="create-title"
                            className="input"
                            maxLength={60}
                            placeholder="Road trip classics"
                            value={draft.title}
                            onChange={(e) => draftStore.set({ title: e.target.value })}
                        />
                    </div>
                    <div className="field">
                        <span className="field-label">Add songs</span>
                        <GuessInput
                            pool={[]}
                            exclude={chosen}
                            country={region}
                            onGuess={add}
                            placeholder="Search for a song to add"
                            dropUp={false}
                        />
                        <span className="field-hint">Songs come from the Apple Music catalog for your region.</span>
                    </div>
                    <PlaylistImport songs={draft.songs} room={MAX_CUSTOM_SONGS - draft.songs.length} country={region} onAdd={addMany} />
                </div>

                <div className="create-list">
                    <div className="create-list-head">
                        <h2>
                            Songs <span className="mono">{draft.songs.length}</span>
                            <span className="create-list-max">/{MAX_CUSTOM_SONGS}</span>
                        </h2>
                        {draft.songs.length > 0 && (
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => draftStore.set({ songs: [] })}>
                                Clear
                            </button>
                        )}
                    </div>

                    {draft.songs.length === 0 ? (
                        <div className="create-empty">
                            <p>Your songs show up here. Search for a song, or import a playlist and pick from it.</p>
                        </div>
                    ) : (
                        <ol className="create-songs">
                            {draft.songs.map((s, i) => (
                                <li key={s.id}>
                                    <span className="create-num mono">{i + 1}</span>
                                    <img src={artworkAt(s.artwork, 100)} alt="" />
                                    <span className="summary-song">
                                        <span className="summary-song-title">{s.title}</span>
                                        <span className="summary-song-artist">{s.artist}</span>
                                    </span>
                                    <span className="create-tools">
                                        <button type="button" className="icon-btn" aria-label={`Move ${s.title} up`} onClick={() => move(i, -1)} disabled={i === 0}>
                                            <ArrowUpIcon size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            className="icon-btn"
                                            aria-label={`Move ${s.title} down`}
                                            onClick={() => move(i, 1)}
                                            disabled={i === draft.songs.length - 1}
                                        >
                                            <ArrowDownIcon size={16} />
                                        </button>
                                        <button type="button" className="icon-btn" aria-label={`Remove ${s.title}`} onClick={() => remove(i)}>
                                            <TrashIcon size={16} />
                                        </button>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}

                    <div className="create-actions">
                        <button type="button" className="btn btn--primary btn--lg" disabled={!enough} onClick={copy}>
                            <LinkSimpleIcon size={18} weight="bold" /> Copy link
                        </button>
                        <button type="button" className="btn btn--secondary btn--lg" disabled={!enough} onClick={() => navigate(path)}>
                            <PlayIcon size={18} weight="fill" /> Try it yourself
                        </button>
                    </div>
                    {!enough && (
                        <p className="field-hint">
                            Add at least {MIN_CUSTOM_SONGS - draft.songs.length} more song{MIN_CUSTOM_SONGS - draft.songs.length === 1 ? '' : 's'} to get a link.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
