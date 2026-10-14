import { AppleLogoIcon, PauseIcon, PlayIcon, ShareNetworkIcon } from '@phosphor-icons/react';
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
import type { DailyData, Song } from '../lib/types';

export default function DailyPage() {
    const [data, setData] = useState<DailyData | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        loadDaily().then(setData, () => setError(true));
    }, []);

    if (error) {
        return (
            <div className="page page-message">
                <h1>Couldn&rsquo;t load today&rsquo;s song</h1>
                <p>Check your connection and try again.</p>
                <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
                    Retry
                </button>
            </div>
        );
    }
    if (!data) return <div className="page page-loading" aria-busy="true"><span className="spinner spinner--lg" /></div>;
    return <DailyGame data={data} />;
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

function DailyGame({ data }: { data: DailyData }) {
    const today = dayIndex(data.epoch);
    const puzzle = today + 1;
    const song = dailySong(data, today);
    const { history } = useStore(dailyStore);
    const { region } = useStore(settingsStore);
    const saved = history[today]?.songId === song.id ? history[today] : undefined;

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
        dailyStore.set((s) => ({ history: { ...s.history, [today]: record } }));
    };

    if (doneOnArrival && saved) return <DailyResult puzzle={puzzle} song={song} record={saved} today={today} />;

    return (
        <GameView
            title={`Daily #${puzzle}`}
            initial={initial}
            pool={data.songs}
            country={region}
            onExit={() => navigate('/')}
            onChange={persist}
            dropUnplayable={false}
            renderFinished={() => {
                const record = dailyStore.get().history[today];
                return record ? <DailyResult puzzle={puzzle} song={song} record={record} today={today} /> : null;
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
                New song ready
            </button>
        );
    }
    return <span className="countdown mono">{formatCountdown(ms)}</span>;
}

function DailyResult({ puzzle, song, record, today }: { puzzle: number; song: Song; record: DailyRecord; today: number }) {
    const { toast } = useUi();
    const { history } = useStore(dailyStore);
    const stats = dailyStats(history, today);
    const won = record.outcome === 'won';
    const tries = record.marks.length;
    const [playing, setPlaying] = useState(false);
    const links = listenLinks(song);

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
        const outcome = await shareText(dailyShareText(puzzle, record.marks, won));
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
                    <p className="setup-kicker">Daily #{puzzle}</p>
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
                    <h2>Your daily stats</h2>
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
                <div className="daily-panel daily-next">
                    <h2>Next song in</h2>
                    <Countdown />
                    <p>A new song unlocks at midnight. Warm up with a pack in the meantime.</p>
                    <Link to="/packs" className="btn btn--secondary">
                        Browse packs
                    </Link>
                </div>
            </div>
        </section>
    );
}
