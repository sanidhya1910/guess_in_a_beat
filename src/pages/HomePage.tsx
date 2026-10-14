import { ArrowRightIcon, MagnifyingGlassIcon, PlayIcon, ShuffleIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { useMemo, useState, type FormEvent } from 'react';
import { CoverGrid } from '../components/CoverGrid';
import { PackCard } from '../components/PackCard';
import { DAILY_EPOCH, dayIndex } from '../lib/daily';
import { artworkAt } from '../lib/itunes';
import { PACKS, POPULAR_ARTISTS, randomPack } from '../lib/packs';
import { Link } from '../lib/Link';
import { navigate } from '../lib/router';
import { dailyStats, dailyStore, settingsStore } from '../lib/state';
import { useStore } from '../lib/store';

function heroColumns(): string[][] {
    const covers = [...new Set(PACKS.filter((p) => p.category !== 'charts').flatMap((p) => p.covers))];
    const columns: string[][] = [[], [], []];
    covers.slice(0, 21).forEach((c, i) => columns[i % 3].push(c));
    return columns;
}

const HERO_COLUMNS = heroColumns();

function DailyButton() {
    const today = dayIndex(DAILY_EPOCH);
    const { history } = useStore(dailyStore);
    const record = history[today];
    const done = record && record.outcome !== 'playing';
    return (
        <Link to="/daily" className="btn btn--primary btn--lg">
            <PlayIcon size={18} weight="fill" />
            {done ? "See today's result" : record ? "Finish today's song" : "Play today's song"}
        </Link>
    );
}

function StreakNote() {
    const today = dayIndex(DAILY_EPOCH);
    const { history } = useStore(dailyStore);
    const { currentStreak } = dailyStats(history, today);
    if (currentStreak < 2) return null;
    return (
        <p className="hero-streak">
            <span className="mono">{currentStreak}</span> day streak. Keep it going.
        </p>
    );
}

export default function HomePage() {
    const charts = PACKS.filter((p) => p.category === 'charts');
    const decades = PACKS.filter((p) => p.category === 'decades');
    const genres = PACKS.filter((p) => p.category === 'genres');
    const { region } = useStore(settingsStore);
    const [artistQuery, setArtistQuery] = useState('');
    const fan = useMemo(() => {
        const pool = PACKS.flatMap((p) => p.covers);
        return [pool[3], pool[17], pool[29]].filter(Boolean);
    }, []);

    const searchArtist = (e: FormEvent) => {
        e.preventDefault();
        const q = artistQuery.trim();
        navigate(q ? `/artists?q=${encodeURIComponent(q)}` : '/artists');
    };

    return (
        <div className="home">
            <section className="hero page">
                <div className="hero-copy">
                    <h1 className="hero-title">How fast can you name a song?</h1>
                    <p className="hero-sub">
                        Hear a split second of a track. Every miss plays a little more. Free, with no sign-up and no ads.
                    </p>
                    <div className="hero-ctas">
                        <DailyButton />
                        <button type="button" className="btn btn--secondary btn--lg" onClick={() => navigate(`/play/${randomPack().id}`)}>
                            <ShuffleIcon size={18} weight="bold" /> Quick play
                        </button>
                        <Link to="/party" className="btn btn--ghost btn--lg">
                            <UsersThreeIcon size={18} weight="fill" /> Play with friends
                        </Link>
                    </div>
                    <StreakNote />
                </div>
                <div className="hero-wall" aria-hidden="true">
                    {HERO_COLUMNS.map((col, i) => (
                        <div key={i} className={`hero-col hero-col--${i}`}>
                            {[...col, ...col].map((url, j) => (
                                <img key={j} src={artworkAt(url, 300)} alt="" loading={j < 4 ? 'eager' : 'lazy'} decoding="async" />
                            ))}
                        </div>
                    ))}
                </div>
            </section>

            {charts.length > 0 && (
                <section className="home-section page">
                    <div className="section-head">
                        <h2>On repeat right now</h2>
                        <Link to="/packs" className="section-link">
                            All packs <ArrowRightIcon size={16} weight="bold" />
                        </Link>
                    </div>
                    <div className="charts-row">
                        {charts.map((p) => (
                            <PackCard key={p.id} pack={p} variant="wide" />
                        ))}
                    </div>
                </section>
            )}

            <section className="home-section">
                <div className="section-head page">
                    <h2>Pick an era</h2>
                </div>
                <div className="rail" role="list">
                    {decades.map((p) => (
                        <Link key={p.id} to={`/play/${p.id}`} className="era-card" role="listitem">
                            <CoverGrid covers={p.covers} size={280} className="era-card-art" />
                            <span className="era-card-label">{p.id}</span>
                            <span className="era-card-title">{p.title}</span>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="home-section page">
                <div className="section-head">
                    <h2>Or go by genre</h2>
                </div>
                <div className="genre-grid">
                    {genres.map((p) => (
                        <PackCard key={p.id} pack={p} />
                    ))}
                </div>
            </section>

            <section className="home-section page">
                <div className="artist-band">
                    <div className="artist-band-copy">
                        <h2>Know an artist inside out?</h2>
                        <p>Pick anyone and we&rsquo;ll play their biggest songs.</p>
                        <form className="artist-band-search" onSubmit={searchArtist} role="search">
                            <div className="search-field">
                                <MagnifyingGlassIcon size={20} />
                                <input
                                    className="input"
                                    type="search"
                                    placeholder="Search for an artist"
                                    aria-label="Search for an artist"
                                    value={artistQuery}
                                    onChange={(e) => setArtistQuery(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="btn btn--primary">
                                Search
                            </button>
                        </form>
                    </div>
                    <ul className="artist-row">
                        {POPULAR_ARTISTS.slice(0, 10).map((a) => (
                            <li key={a.id}>
                                <Link to={`/artist/${a.id}?cc=${a.country === 'in' ? 'in' : region}`} className="artist-chip">
                                    <img src={artworkAt(a.artwork, 160)} alt="" loading="lazy" />
                                    <span>{a.name}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="home-section page">
                <div className="create-band">
                    <div className="create-band-copy">
                        <h2>Make a quiz for your friends</h2>
                        <p>Pick the songs, send one link, and see who names them fastest.</p>
                        <Link to="/create" className="btn btn--primary btn--lg">
                            Create a challenge
                        </Link>
                    </div>
                    <div className="create-band-fan" aria-hidden="true">
                        {fan.map((url, i) => (
                            <img key={i} src={artworkAt(url, 400)} alt="" loading="lazy" />
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
