import { SpotifyLogoIcon, YoutubeLogoIcon } from '@phosphor-icons/react';
import { useMemo, useState, type FormEvent } from 'react';
import { useUi } from '../app/ui-context';
import { simplify, songKey } from '../lib/match';
import { parsePlaylistUrl, type Playlist } from '../lib/playlist-protocol';
import { loadPlaylist, matchTracks } from '../lib/playlists';
import type { Song } from '../lib/types';
import { Dialog } from './Dialog';

interface PlaylistImportProps {
    /** Songs already in the challenge. */
    songs: Song[];
    /** How many more songs the challenge can take. */
    room: number;
    country: string;
    /** Adds songs to the challenge and returns how many were new. */
    onAdd(songs: Song[]): number;
}

/** What happened to a track the person picked. */
type Outcome = 'added' | 'missing';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function formatLength(seconds?: number): string {
    if (!seconds) return '';
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// Paste a Spotify or YouTube playlist link, tick the songs you want, and they
// are looked up in the iTunes catalog and added to the challenge.
export function PlaylistImport({ songs, room, country, onAdd }: PlaylistImportProps) {
    const { toast } = useUi();
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [outcomes, setOutcomes] = useState<Map<number, Outcome>>(new Map());
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [filter, setFilter] = useState('');

    const inChallenge = useMemo(() => new Set(songs.map(songKey)), [songs]);
    const tracks = useMemo(() => playlist?.tracks.map((track, i) => ({ track, i, key: songKey(track) })) ?? [], [playlist]);
    const visible = useMemo(() => {
        const q = simplify(filter);
        return q ? tracks.filter(({ track }) => simplify(`${track.title} ${track.artist}`).includes(q)) : tracks;
    }, [tracks, filter]);

    /** Tracks that are done with: added, already in the challenge, or not in the catalog. */
    const settled = (i: number, key: string) => outcomes.has(i) || inChallenge.has(key);
    const left = room - selected.size;
    const matching = progress !== null;
    const selectable = visible.filter(({ i, key }) => !settled(i, key)).length;

    const load = async (e: FormEvent) => {
        e.preventDefault();
        if (!parsePlaylistUrl(link)) {
            setError('That doesn’t look like a Spotify or YouTube playlist link.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const list = await loadPlaylist(link.trim());
            if (!list.tracks.length) throw new Error('That playlist has no songs in it.');
            setPlaylist(list);
            setSelected(new Set());
            setOutcomes(new Map());
            setFilter('');
            setOpen(true);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const toggle = (i: number) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (!next.delete(i) && next.size < room) next.add(i);
            return next;
        });

    const selectVisible = () =>
        setSelected((prev) => {
            const next = new Set(prev);
            for (const { i, key } of visible) {
                if (next.size >= room) break;
                if (!settled(i, key)) next.add(i);
            }
            return next;
        });

    const add = async () => {
        if (!playlist || !selected.size) return;
        const picked = [...selected].sort((a, b) => a - b);
        let added = 0;
        let missing = 0;
        let answered = 0;
        setProgress({ done: 0, total: picked.length });
        try {
            await matchTracks(
                picked.map((i) => playlist.tracks[i]),
                country,
                (start, results) => {
                    const found: Song[] = [];
                    const marks = new Map<number, Outcome>();
                    results.forEach((r, k) => {
                        if (r.status === 'busy') return;
                        answered++;
                        if (r.status === 'found') found.push(r.song);
                        else missing++;
                        marks.set(picked[start + k], r.status === 'found' ? 'added' : 'missing');
                    });
                    added += onAdd(found);
                    setOutcomes((prev) => new Map([...prev, ...marks]));
                    setSelected((prev) => new Set([...prev].filter((i) => !marks.has(i))));
                    setProgress({ done: start + results.length, total: picked.length });
                },
            );
        } catch (err) {
            toast((err as Error).message);
        }
        setProgress(null);

        const unanswered = picked.length - answered;
        const parts = [`Added ${plural(added, 'song')}.`];
        if (missing) parts.push(`${plural(missing, 'song')} aren’t in the Apple Music catalog.`);
        if (unanswered) parts.push('The music catalog is busy, so try the rest again in a minute.');
        toast(parts.join(' '));
        if (!missing && !unanswered) setOpen(false);
    };

    const SourceIcon = playlist?.source === 'spotify' ? SpotifyLogoIcon : YoutubeLogoIcon;

    return (
        <>
            <form className="field" onSubmit={load} noValidate>
                <label className="field-label" htmlFor="import-link">
                    Import a playlist
                </label>
                <div className="import-bar">
                    <input
                        id="import-link"
                        className="input"
                        type="url"
                        inputMode="url"
                        autoComplete="off"
                        placeholder="Spotify or YouTube playlist link"
                        value={link}
                        aria-invalid={error ? true : undefined}
                        aria-describedby="import-hint"
                        onChange={(e) => setLink(e.target.value)}
                    />
                    <button type="submit" className="btn btn--secondary" disabled={loading || !link.trim()}>
                        {loading ? 'Loading…' : 'Load'}
                    </button>
                </div>
                <span id="import-hint" className={`field-hint${error ? ' field-hint--error' : ''}`} role={error ? 'alert' : undefined}>
                    {error || 'Public playlists and albums. You pick which songs to add.'}
                </span>
                {playlist && !open && (
                    <button type="button" className="btn btn--ghost btn--sm import-reopen" onClick={() => setOpen(true)}>
                        <SourceIcon size={16} weight="fill" /> Back to {playlist.title}
                    </button>
                )}
            </form>

            <Dialog open={open} title={playlist?.title ?? 'Playlist'} onClose={() => setOpen(false)}>
                {playlist && (
                    <div className="import">
                        <p className="import-meta">
                            <SourceIcon size={16} weight="fill" aria-hidden />
                            {playlist.source === 'spotify' ? 'Spotify' : 'YouTube'} · {plural(playlist.tracks.length, 'track')}
                            {playlist.source === 'spotify' && playlist.tracks.length >= 100 && ' (the first 100)'}
                        </p>

                        <div className="import-tools">
                            <input
                                className="input"
                                type="search"
                                placeholder="Filter by title or artist"
                                aria-label="Filter tracks"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                            {selected.size ? (
                                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected(new Set())} disabled={matching}>
                                    Clear
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--sm"
                                    onClick={selectVisible}
                                    disabled={matching || room === 0 || selectable === 0}
                                >
                                    Select {room < selectable ? room : 'all'}
                                </button>
                            )}
                        </div>

                        {visible.length === 0 ? (
                            <p className="import-empty">No tracks match “{filter}”.</p>
                        ) : (
                            <ul className="import-list">
                                {visible.map(({ track, i, key }) => {
                                    const outcome = outcomes.get(i) ?? (inChallenge.has(key) ? 'added' : undefined);
                                    const checked = selected.has(i) || outcome === 'added';
                                    return (
                                        <li key={i}>
                                            <label className={`import-row${outcome ? ` is-${outcome}` : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={!!outcome || matching || (!checked && left <= 0)}
                                                    onChange={() => toggle(i)}
                                                />
                                                <span className="summary-song">
                                                    <span className="summary-song-title">{track.title}</span>
                                                    <span className="summary-song-artist">{track.artist}</span>
                                                </span>
                                                <span className="import-side mono">
                                                    {outcome === 'added' ? 'Added' : outcome === 'missing' ? 'Not found' : formatLength(track.duration)}
                                                </span>
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        <footer className="import-foot">
                            <span className="import-count" aria-live="polite">
                                {progress
                                    ? `Finding songs… ${progress.done}/${progress.total}`
                                    : room === 0
                                      ? 'Your challenge is full.'
                                      : `${selected.size} selected · ${plural(left, 'space')} left`}
                            </span>
                            <button type="button" className="btn btn--primary" disabled={!selected.size || matching} onClick={add}>
                                {matching ? 'Adding…' : `Add ${selected.size ? plural(selected.size, 'song') : 'songs'}`}
                            </button>
                        </footer>
                    </div>
                )}
            </Dialog>
        </>
    );
}
