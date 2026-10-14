import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { artworkAt, RateLimitError, searchSongs } from '../lib/itunes';
import { simplify, songKey, splitArtists } from '../lib/match';
import type { Song } from '../lib/types';

interface GuessInputProps {
    /** Songs suggested instantly from the current pack, without a network call. */
    pool: Song[];
    /** Song keys already guessed this round; hidden from suggestions. */
    exclude: Set<string>;
    country: string;
    onGuess(song: Song): void;
    placeholder?: string;
    /** Open the suggestion list above the field (it sits low on the screen). */
    dropUp?: boolean;
}

const MAX_OPTIONS = 8;

export function GuessInput({ pool, exclude, country, onGuess, placeholder = 'Know it? Search for the song', dropUp = true }: GuessInputProps) {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const [query, setQuery] = useState('');
    const [remote, setRemote] = useState<{ query: string; songs: Song[] }>({ query: '', songs: [] });
    const [pending, setPending] = useState(false);
    const [notice, setNotice] = useState('');
    const [active, setActive] = useState(-1);
    const [open, setOpen] = useState(false);

    const index = useMemo(
        () => pool.map((song) => ({ song, hay: `${simplify(song.title)} ${splitArtists(song.artist).join(' ')}` })),
        [pool],
    );

    const term = query.trim();

    const local = useMemo(() => {
        const tokens = simplify(term).split(' ').filter(Boolean);
        if (term.length < 2 || !tokens.length) return [];
        return index.filter((e) => tokens.every((t) => e.hay.includes(t))).map((e) => e.song);
    }, [index, term]);

    // Remote search, debounced and cancelled on every keystroke.
    useEffect(() => {
        if (term.length < 2) return;
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => {
            setPending(true);
            searchSongs(term, country, ctrl.signal)
                .then((songs) => {
                    setRemote({ query: term, songs });
                    setNotice('');
                })
                .catch((err: Error) => {
                    if (err.name === 'AbortError') return;
                    setNotice(
                        err instanceof RateLimitError
                            ? 'Search is catching its breath. Showing songs from this game for now.'
                            : 'Song search is unavailable right now. Showing songs from this game.',
                    );
                })
                .finally(() => setPending(false));
        }, 280);
        return () => {
            window.clearTimeout(timer);
            ctrl.abort();
        };
    }, [term, country]);

    const options = useMemo(() => {
        if (term.length < 2) return [];
        const seen = new Set(exclude);
        const out: Song[] = [];
        // Remote results lag a keystroke or two behind; keep them while they
        // still relate to what is typed.
        const a = term.toLowerCase();
        const b = remote.query.toLowerCase();
        const remoteSongs = b && (a.startsWith(b) || b.startsWith(a)) ? remote.songs : [];
        for (const s of [...local.slice(0, 5), ...remoteSongs, ...local.slice(5)]) {
            const key = songKey(s);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(s);
            if (out.length >= MAX_OPTIONS) break;
        }
        return out;
    }, [local, remote, exclude, term]);

    const noMatch = !options.length && !pending && !notice && remote.query === term;
    const showList = open && term.length >= 2 && (options.length > 0 || !!notice || noMatch);
    const activeIndex = active < options.length ? active : -1;

    useEffect(() => {
        if (activeIndex < 0) return;
        listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const choose = (song: Song) => {
        onGuess(song);
        setQuery('');
        setActive(-1);
        setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            if (!options.length) return;
            e.preventDefault();
            setOpen(true);
            const dir = e.key === 'ArrowDown' ? 1 : -1;
            setActive((i) => {
                const n = options.length;
                return i < 0 ? (dir === 1 ? 0 : n - 1) : (i + dir + n) % n;
            });
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0) {
                e.preventDefault();
                choose(options[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
            setActive(-1);
        }
    };

    return (
        <div className="search guess">
            <div className="search-field">
                <MagnifyingGlassIcon size={20} />
                <input
                    ref={inputRef}
                    className="input"
                    type="text"
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={`${id}-list`}
                    aria-autocomplete="list"
                    aria-activedescendant={activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
                    aria-label="Search for the song"
                    placeholder={placeholder}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setActive(-1);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setOpen(false)}
                    onKeyDown={onKeyDown}
                />
                {pending && <span className="spinner search-spinner" aria-hidden="true" />}
            </div>
            {showList && (
                <ul
                    ref={listRef}
                    id={`${id}-list`}
                    role="listbox"
                    aria-label="Suggestions"
                    className={`results ${dropUp ? 'results--up' : 'results--down'}`}
                >
                    {options.map((song, i) => (
                        <li
                            key={song.id}
                            id={`${id}-opt-${i}`}
                            role="option"
                            aria-selected={i === activeIndex}
                            className="result"
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => choose(song)}
                        >
                            {song.artwork ? <img src={artworkAt(song.artwork, 100)} alt="" loading="lazy" /> : <span />}
                            <span className="result-text">
                                <span className="result-title">{song.title}</span>
                                <span className="result-sub">{song.artist}</span>
                            </span>
                            {song.year && <span className="result-meta mono">{song.year}</span>}
                        </li>
                    ))}
                    {notice && <li className="results-note">{notice}</li>}
                    {noMatch && <li className="results-note">No songs match &ldquo;{term}&rdquo;.</li>}
                </ul>
            )}
        </div>
    );
}
