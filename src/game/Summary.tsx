import { ArrowCounterClockwiseIcon, CrownIcon, LinkSimpleIcon, ShareNetworkIcon } from '@phosphor-icons/react';
import { useUi } from '../app/ui-context';
import { artworkAt } from '../lib/itunes';
import { Link } from '../lib/Link';
import { DIFFICULTIES } from '../lib/scoring';
import { gameShareText, shareText } from '../lib/share';
import { markOf, type GameState } from './reducer';

interface SummaryProps {
    title: string;
    state: GameState;
    isBest: boolean;
    best: number;
    challengeScore?: number;
    challengeLink: string;
    onPlayAgain(): void;
    moreLink: { to: string; label: string };
}

export function Summary({ title, state, isBest, best, challengeScore, challengeLink, onPlayAgain, moreLink }: SummaryProps) {
    const { toast } = useUi();
    const correct = state.results.filter((r) => r.won).length;
    const total = state.results.length;
    const tries = state.results.filter((r) => r.won).map((r) => r.attempts.length);
    const avg = tries.length ? (tries.reduce((a, b) => a + b, 0) / tries.length).toFixed(1) : '-';

    const share = async () => {
        const text = gameShareText({
            title,
            score: state.score,
            correct,
            total,
            tries: state.results.map((r) => (r.won ? r.attempts.length : null)),
            link: challengeLink,
        });
        const outcome = await shareText(text);
        if (outcome === 'copied') toast('Result copied. Paste it anywhere.');
        if (outcome === 'failed') toast('Could not copy. Try again.');
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(challengeLink);
            toast('Challenge link copied');
        } catch {
            toast('Could not copy the link');
        }
    };

    let challengeLine: string | null = null;
    if (challengeScore !== undefined) {
        if (state.score > challengeScore) challengeLine = `You beat your friend's ${challengeScore} points.`;
        else if (state.score === challengeScore) challengeLine = `Dead heat with your friend at ${challengeScore} points.`;
        else challengeLine = `Your friend still leads with ${challengeScore} points.`;
    }

    return (
        <section className="summary page">
            <header className="summary-head">
                <p className="summary-kicker">
                    {title}, {DIFFICULTIES[state.difficulty].label}
                </p>
                <p className="summary-score mono">
                    {state.score}
                    <span>points</span>
                </p>
                {isBest && (
                    <p className="badge">
                        <CrownIcon size={16} weight="fill" /> New personal best
                    </p>
                )}
                {challengeLine && <p className="summary-challenge">{challengeLine}</p>}
            </header>

            <dl className="stat-row stat-row--3 summary-stats">
                <div>
                    <dt>Named</dt>
                    <dd className="mono">
                        {correct}/{total}
                    </dd>
                </div>
                <div>
                    <dt>Avg. tries</dt>
                    <dd className="mono">{avg}</dd>
                </div>
                <div>
                    <dt>Best</dt>
                    <dd className="mono">{best}</dd>
                </div>
            </dl>

            <div className="summary-actions">
                <button type="button" className="btn btn--primary btn--lg" onClick={share}>
                    <ShareNetworkIcon size={18} weight="bold" /> Share result
                </button>
                <button type="button" className="btn btn--secondary btn--lg" onClick={copyLink}>
                    <LinkSimpleIcon size={18} weight="bold" /> Copy challenge link
                </button>
                <button type="button" className="btn btn--ghost btn--lg" onClick={onPlayAgain}>
                    <ArrowCounterClockwiseIcon size={18} weight="bold" /> Play again
                </button>
            </div>

            <ol className="summary-list">
                {state.results.map((r, i) => (
                    <li key={`${r.song.id}-${i}`} style={{ animationDelay: `${Math.min(i * 40, 600)}ms` }}>
                        <img src={artworkAt(r.song.artwork, 120)} alt="" loading="lazy" />
                        <span className="summary-song">
                            <span className="summary-song-title">{r.song.title}</span>
                            <span className="summary-song-artist">{r.song.artist}</span>
                        </span>
                        <span className="marks" aria-label={r.won ? `Named in ${r.attempts.length}` : 'Missed'}>
                            {r.attempts.map((a, j) => (
                                <span key={j} className={`mark mark--${markOf(a)}`} />
                            ))}
                            {!r.won && r.attempts.length === 0 && <span className="mark mark--skip" />}
                        </span>
                        <span className={`summary-pts mono${r.won ? '' : ' is-zero'}`}>{r.won ? `+${r.points}` : '0'}</span>
                    </li>
                ))}
            </ol>

            <p className="summary-more">
                <Link to={moreLink.to} className="btn btn--ghost">
                    {moreLink.label}
                </Link>
            </p>
        </section>
    );
}
