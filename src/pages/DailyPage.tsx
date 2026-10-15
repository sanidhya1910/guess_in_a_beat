import {
    AppleLogoIcon,
    CaretRightIcon,
    FilmSlateIcon,
    GuitarIcon,
    HeadphonesIcon,
    MicrophoneStageIcon,
    PauseIcon,
    PlayIcon,
    ShareNetworkIcon,
    SparkleIcon,
    SunIcon,
    type Icon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useUi } from '../app/ui-context';
import { Distribution } from '../components/Distribution';
import { GameView } from '../game/GameView';
import { initGame, markOf, type Attempt, type GameState } from '../game/reducer';
import { audio } from '../lib/audio';
import { dailySong, dayIndex, formatCountdown, msUntilNextDay } from '../lib/daily';
import { artworkAt } from '../lib/itunes';
import { listenLinks } from '../lib/links';
import type { Verdict } from '../lib/match';
import { loadDaily } from '../lib/packs';
import { Link } from '../lib/Link';
import { navigate } from '../lib/router';
import { dailyShareText, shareText } from '../lib/share';
import { dailyStats, dailyStore, settingsStore, type DailyRecord } from '../lib/state';
import { useStore } from '../lib/store';
import type { DailyCategory, DailyData, Song } from '../lib/types';

const ICONS: Record<string, Icon> = {
    pop: MicrophoneStageIcon,
    hiphop: HeadphonesIcon,
    rock: GuitarIcon,
    bollywood: FilmSlateIcon,
    latin: SunIcon,
    kpop: SparkleIcon,
};

export default function DailyPage({ params }: { params: Record<string, string> }) {
    const [data, setData] = useState<DailyData | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        loadDaily().then(setData, () => setError(true));
    }, []);

    if (error) {
        return (
            <div className="page page-message">
                <h1>Couldn&rsquo;t load today&rsquo;s songs</h1>
                <p>Check your connection and try again.</p>
                <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
                    Retry
                </button>
            </div>
        );
    }
    if (!data) return <div className="page page-loading" aria-busy="true"><span className="spinner spinner--lg" /></div>;
    if (!params.category) return <DailyPicker data={data} />;

    const category = data.categories.find((c) => c.id === params.category);
    if (!category) {
        return (
            <div className="page page-message">
                <h1>No such category</h1>
                <p>Pick one of today&rsquo;s categories instead.</p>
                <Link to="/daily" className="btn btn--primary">
                    See today&rsquo;s songs
                </Link>
            </div>
        );
    }
    return <DailyGame key={category.id} data={data} category={category} />;
}

/** Today's record for a category, if it belongs to today's song. */
function useTodayRecord(category: DailyCategory, today: number): DailyRecord | undefined {
    const { categories } = useStore(dailyStore);
    const record = categories[category.id]?.[today];
    return record?.songId === dailySong(category, today).id ? record : undefined;
}

function statusLabel(record: DailyRecord | undefined): { text: string; tone: string } {
    if (!record) return { text: 'Play', tone: 'new' };
    if (record.outcome === 'playing') return { text: 'Continue', tone: 'playing' };
    if (record.outcome === 'won') return { text: record.marks.length === 1 ? 'First try' : `Got it in ${record.marks.length}`, tone: 'won' };
    return { text: 'Missed', tone: 'lost' };
}

function CategoryRow({ category, today }: { category: DailyCategory; today: number }) {
    const record = useTodayRecord(category, today);
    const done = record && record.outcome !== 'playing';
    const CategoryIcon = ICONS[category.id] ?? MicrophoneStageIcon;
    const status = statusLabel(record);
    return (
        <li>
            <Link to={`/daily/${category.id}`} className="daily-cat">
                {/* The cover would give the song away, so it only shows once the round is over. */}
                {done ? (
                    <img className="daily-cat-art" src={artworkAt(dailySong(category, today).artwork, 120)} alt="" />
                ) : (
                    <span className="daily-cat-art daily-cat-icon" aria-hidden="true">
                        <CategoryIcon size={26} weight="fill" />
                    </span>
                )}
                <span className="daily-cat-text">
                    <span className="daily-cat-title">{category.title}</span>
                    <span className="daily-cat-blurb">{category.blurb}</span>
                </span>
                <span className={`daily-cat-status daily-cat-status--${status.tone}`}>{status.text}</span>
                <CaretRightIcon className="daily-cat-go" size={18} weight="bold" aria-hidden="true" />
            </Link>
        </li>
    );
}

function DailyPicker({ data }: { data: DailyData }) {
    const today = dayIndex(data.epoch);
    return (
        <section className="daily-pick page">
            <header className="daily-pick-head">
                <p className="setup-kicker">Daily #{today + 1}</p>
                <h1 className="setup-title">Pick a category</h1>
                <p className="setup-blurb">Each category has its own song today, the same for everyone. Play the ones you know.</p>
            </header>
            <ul className="daily-cats">
                {data.categories.map((c) => (
                    <CategoryRow key={c.id} category={c} today={today} />
                ))}
            </ul>
            <p className="daily-pick-next">
                New songs in <Countdown />
            </p>
        </section>
    );
}

function restore(record: DailyRecord | undefined): Attempt[] {
    if (!record) return [];
    return record.marks.map((mark, i): Attempt => {
        const guess = record.guesses?.[i];
        if (mark === 'skip' || !guess) return { kind: 'skip' };
        return {
            kind: 'guess',
            verdict: mark as Verdict,
            song: { id: -1 - i, title: guess.title, artist: guess.artist, album: '', artwork: '', preview: '' },
        };
    });
}

function DailyGame({ data, category }: { data: DailyData; category: DailyCategory }) {
    const today = dayIndex(data.epoch);
    const puzzle = today + 1;
    const song = dailySong(category, today);
    const saved = useTodayRecord(category, today);
    const { region } = useStore(settingsStore);

    // Decide once, on arrival, whether today is already done; otherwise the
    // game keeps showing its reveal even after the record flips to finished.
    const [doneOnArrival] = useState(() => !!saved && saved.outcome !== 'playing');
    const [initial] = useState(() => initGame([song], 1, 'normal', restore(saved)));
    const lastSaved = useRef('');

    const persist = (state: GameState) => {
        const outcome: DailyRecord['outcome'] =
            state.phase === 'guessing' ? 'playing' : state.results[0]?.won ? 'won' : 'lost';
        if (outcome === 'playing' && state.attempts.length === 0) return;
        const record: DailyRecord = {
            songId: song.id,
            marks: state.attempts.map(markOf),
            guesses: state.attempts.map((a) => (a.kind === 'guess' ? { title: a.song.title, artist: a.song.artist } : null)),
            outcome,
        };
        const json = JSON.stringify(record);
        if (json === lastSaved.current) return;
        lastSaved.current = json;
        dailyStore.set((s) => ({
            ...s,
            categories: { ...s.categories, [category.id]: { ...s.categories[category.id], [today]: record } },
        }));
    };

    const result = (record: DailyRecord) => (
        <DailyResult data={data} category={category} puzzle={puzzle} song={song} record={record} today={today} />
    );

    if (doneOnArrival && saved) return result(saved);

    return (
        <GameView
            title={`Daily #${puzzle} · ${category.title}`}
            initial={initial}
            pool={category.songs}
            country={region}
            onExit={() => navigate('/daily')}
            onChange={persist}
            dropUnplayable={false}
            renderFinished={() => {
                const record = dailyStore.get().categories[category.id]?.[today];
                return record ? result(record) : null;
            }}
        />
    );
}

function Countdown() {
    const [ms, setMs] = useState(() => msUntilNextDay());
    useEffect(() => {
        const timer = window.setInterval(() => setMs(msUntilNextDay()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    if (ms <= 1000) {
        return (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => window.location.reload()}>
                New songs ready
            </button>
        );
    }
    return <span className="countdown mono">{formatCountdown(ms)}</span>;
}

interface DailyResultProps {
    data: DailyData;
    category: DailyCategory;
    puzzle: number;
    song: Song;
    record: DailyRecord;
    today: number;
}

function DailyResult({ data, category, puzzle, song, record, today }: DailyResultProps) {
    const { toast } = useUi();
    const { categories } = useStore(dailyStore);
    const stats = dailyStats(categories[category.id] ?? {}, today);
    const won = record.outcome === 'won';
    const tries = record.marks.length;
    const [playing, setPlaying] = useState(false);
    const links = listenLinks(song);
    const others = data.categories.filter((c) => {
        const rec = categories[c.id]?.[today];
        return c.id !== category.id && !(rec && rec.songId === dailySong(c, today).id && rec.outcome !== 'playing');
    });

    useEffect(() => () => audio.stop(), []);

    const toggle = async () => {
        audio.unlock();
        if (playing) {
            audio.stop();
            setPlaying(false);
            return;
        }
        setPlaying(true);
        try {
            const p = await audio.prepare(song);
            audio.playFull(p, () => setPlaying(false));
        } catch {
            setPlaying(false);
            toast('The preview would not load');
        }
    };

    const share = async () => {
        const outcome = await shareText(dailyShareText(puzzle, category, record.marks, won));
        if (outcome === 'copied') toast('Result copied. Paste it anywhere.');
        if (outcome === 'failed') toast('Could not copy. Try again.');
    };

    return (
        <section className="daily-result page">
            <div className="daily-result-hero">
                <div className="daily-result-art">
                    <img className="reveal-glow" src={artworkAt(song.artwork, 600)} alt="" aria-hidden="true" />
                    <img className="art" src={artworkAt(song.artwork, 600)} alt={`Cover of ${song.album || song.title}`} />
                    <button
                        type="button"
                        className="daily-result-play"
                        onClick={toggle}
                        aria-label={playing ? 'Pause the song' : 'Play the song'}
                    >
                        {playing ? <PauseIcon size={22} weight="fill" /> : <PlayIcon size={22} weight="fill" />}
                    </button>
                </div>
                <div className="daily-result-text">
                    <p className="setup-kicker">
                        Daily #{puzzle} · {category.title}
                    </p>
                    <h1 className="daily-result-title">{won ? (tries === 1 ? 'First try!' : `Got it in ${tries}`) : 'Not today'}</h1>
                    <p className="daily-result-song">
                        <strong>{song.title}</strong> by {song.artist}
                    </p>
                    <span className="marks marks--lg" aria-label={won ? `Solved in ${tries} of 6` : 'Not solved'}>
                        {Array.from({ length: 6 }, (_, i) => (
                            <span key={i} className={`mark${record.marks[i] ? ` mark--${record.marks[i]}` : ''}`} />
                        ))}
                    </span>
                    <div className="daily-result-actions">
                        <button type="button" className="btn btn--primary btn--lg" onClick={share}>
                            <ShareNetworkIcon size={18} weight="bold" /> Share
                        </button>
                        <a className="btn btn--ghost btn--lg" href={links.apple} target="_blank" rel="noopener noreferrer">
                            <AppleLogoIcon size={18} weight="fill" /> Apple Music
                        </a>
                    </div>
                </div>
            </div>

            <div className="daily-result-grid">
                <div className="daily-panel">
                    <h2>Your {category.title} stats</h2>
                    <dl className="stat-row">
                        <div>
                            <dt>Played</dt>
                            <dd className="mono">{stats.played}</dd>
                        </div>
                        <div>
                            <dt>Win rate</dt>
                            <dd className="mono">{stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}%</dd>
                        </div>
                        <div>
                            <dt>Streak</dt>
                            <dd className="mono">{stats.currentStreak}</dd>
                        </div>
                        <div>
                            <dt>Best streak</dt>
                            <dd className="mono">{stats.maxStreak}</dd>
                        </div>
                    </dl>
                    <Distribution counts={stats.distribution} highlight={won ? tries - 1 : 6} />
                </div>
                {others.length > 0 ? (
                    <div className="daily-panel daily-next">
                        <h2>Try another category</h2>
                        <ul className="daily-cats daily-cats--compact">
                            {others.map((c) => (
                                <CategoryRow key={c.id} category={c} today={today} />
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="daily-panel daily-next">
                        <h2>New songs in</h2>
                        <Countdown />
                        <p>You&rsquo;ve played every category today. Warm up with a pack until midnight.</p>
                        <Link to="/packs" className="btn btn--secondary">
                            Browse packs
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
}
