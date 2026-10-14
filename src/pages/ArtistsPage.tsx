import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { artworkAt, searchArtists, type ArtistResult } from '../lib/itunes';
import { POPULAR_ARTISTS } from '../lib/packs';
import { Link } from '../lib/Link';
import { useLocation } from '../lib/router';
import { settingsStore } from '../lib/state';
import { useStore } from '../lib/store';

export default function ArtistsPage() {
    const { query } = useLocation();
    const { region } = useStore(settingsStore);
    const [text, setText] = useState(query.get('q') ?? '');
    const [results, setResults] = useState<{ term: string; artists: ArtistResult[] }>({ term: '', artists: [] });
    const [status, setStatus] = useState<{ term: string; state: 'loading' | 'error'; message?: string } | null>(null);
    const term = text.trim();

    useEffect(() => {
        if (term.length < 2) return;
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => {
            setStatus({ term, state: 'loading' });
            searchArtists(term, region, ctrl.signal).then(
                (artists) => {
                    setResults({ term, artists });
                    setStatus(null);
                },
                (err: Error) => {
                    if (err.name === 'AbortError') return;
                    setStatus({
                        term,
                        state: 'error',
                        message: err.name === 'RateLimitError' ? err.message : 'Artist search is unavailable right now.',
                    });
                },
            );
        }, 350);
        return () => {
            window.clearTimeout(timer);
            ctrl.abort();
        };
    }, [term, region]);

    // Keep the search in the URL so it survives a reload or a back navigation.
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const next = term ? `/artists?q=${encodeURIComponent(term)}` : '/artists';
            if (window.location.search !== (term ? `?q=${encodeURIComponent(term)}` : '')) {
                window.history.replaceState(null, '', `${import.meta.env.BASE_URL.replace(/\/$/, '')}${next}`);
            }
        }, 500);
        return () => window.clearTimeout(timer);
    }, [term]);

    const showResults = term.length >= 2 && results.term === term;
    const loading = status?.state === 'loading' && status.term === term;
    const error = status?.state === 'error' && status.term === term ? status.message : '';

    return (
        <section className="page list-page">
            <header className="list-head">
                <h1>Artist mode</h1>
                <p>Pick an artist and name their biggest songs.</p>
            </header>

            <div className="search artists-search">
                <div className="search-field">
                    <MagnifyingGlassIcon size={20} />
                    <input
                        className="input input--lg"
                        type="search"
                        placeholder="Search for an artist"
                        aria-label="Search for an artist"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        autoFocus={!!text}
                    />
                    {loading && <span className="spinner search-spinner" aria-hidden="true" />}
                </div>
            </div>

            {error && <p className="inline-error">{error}</p>}

            {showResults && (
                <section className="artists-block" aria-live="polite">
                    <h2>Results</h2>
                    {results.artists.length ? (
                        <ul className="artist-grid">
                            {results.artists.map((a) => (
                                <li key={a.id}>
                                    <Link to={`/artist/${a.id}?cc=${region}`} className="artist-tile">
                                        <img src={artworkAt(a.artwork, 300)} alt="" loading="lazy" />
                                        <span className="artist-tile-name">{a.name}</span>
                                        {a.genre && <span className="artist-tile-genre">{a.genre}</span>}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="empty-note">No artists found for &ldquo;{term}&rdquo;. Check the spelling or try another name.</p>
                    )}
                </section>
            )}

            <section className="artists-block">
                <h2>Popular picks</h2>
                <ul className="artist-grid">
                    {POPULAR_ARTISTS.map((a) => (
                        <li key={a.id}>
                            <Link to={`/artist/${a.id}?cc=${a.country === 'in' ? 'in' : region}`} className="artist-tile">
                                <img src={artworkAt(a.artwork, 300)} alt="" loading="lazy" />
                                <span className="artist-tile-name">{a.name}</span>
                                {a.genre && <span className="artist-tile-genre">{a.genre}</span>}
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>
        </section>
    );
}
