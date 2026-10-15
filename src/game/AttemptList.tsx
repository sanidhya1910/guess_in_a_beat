import { ApproximateEqualsIcon, CheckIcon, FastForwardIcon, XIcon } from '@phosphor-icons/react';
import { formatSeconds, MAX_ATTEMPTS } from '../lib/scoring';
import type { Attempt } from './reducer';

interface AttemptListProps {
    attempts: Attempt[];
    ladder: number[];
    /** Highlight the next empty row as the one being played. */
    guessing: boolean;
}

export function AttemptList({ attempts, ladder, guessing }: AttemptListProps) {
    return (
        <ol className="attempts" aria-label="Your guesses">
            {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
                const a = attempts[i];
                const current = guessing && i === attempts.length;
                if (!a) {
                    return (
                        <li key={i} className={`attempt${current ? ' is-current' : ''}`}>
                            <span className="attempt-icon" aria-hidden="true" />
                            <span className="attempt-text">{current ? 'Listen, then guess' : ''}</span>
                            <span className="attempt-len mono">{formatSeconds(ladder[i])}</span>
                        </li>
                    );
                }
                if (a.kind === 'skip') {
                    return (
                        <li key={i} className="attempt is-skip">
                            <span className="attempt-icon">
                                <FastForwardIcon size={14} weight="fill" />
                            </span>
                            <span className="attempt-text">Skipped</span>
                            <span className="attempt-len mono">{formatSeconds(ladder[i])}</span>
                        </li>
                    );
                }
                const Icon = a.verdict === 'correct' ? CheckIcon : a.verdict === 'close' ? ApproximateEqualsIcon : XIcon;
                const label = a.verdict === 'correct' ? 'Correct' : a.verdict === 'close' ? 'Close' : 'Wrong';
                return (
                    <li key={i} className={`attempt is-${a.verdict}`}>
                        <span className="attempt-icon">
                            <Icon size={14} weight="bold" aria-label={label} />
                        </span>
                        <span className="attempt-text">
                            <span className="attempt-title">{a.song.title}</span>
                            <span className="attempt-artist">{a.song.artist}</span>
                        </span>
                        <span className="attempt-len mono">{formatSeconds(ladder[i])}</span>
                    </li>
                );
            })}
        </ol>
    );
}
