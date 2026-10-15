import { DIFFICULTIES, formatSeconds } from '../lib/scoring';
import { settingsStore } from '../lib/state';
import { useStore } from '../lib/store';
import { Dialog } from './Dialog';

export function HelpDialog({ open, onClose }: { open: boolean; onClose(): void }) {
    const { difficulty } = useStore(settingsStore);
    const ladder = DIFFICULTIES[difficulty].ladder;

    return (
        <Dialog open={open} title="How to play" onClose={onClose}>
            <div className="help">
                <p className="help-lead">
                    Press play and you hear a tiny slice of a song. Name it in as few tries as you can.
                </p>

                <section className="help-block">
                    <h3>Six tries, longer each time</h3>
                    <p>Every wrong guess or skip unlocks more of the song.</p>
                    <ol className="ladder" aria-label={`Snippet lengths on ${DIFFICULTIES[difficulty].label}`}>
                        {ladder.map((s, i) => (
                            <li key={i} className="mono">
                                {formatSeconds(s)}
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="help-block">
                    <h3>Reading your guesses</h3>
                    <ul className="legend">
                        <li>
                            <span className="mark mark--correct" /> Correct
                        </li>
                        <li>
                            <span className="mark mark--close" /> Close: right artist, or right title by someone else
                        </li>
                        <li>
                            <span className="mark mark--wrong" /> Wrong
                        </li>
                        <li>
                            <span className="mark mark--skip" /> Skipped
                        </li>
                    </ul>
                </section>

                <section className="help-block">
                    <h3>Scoring</h3>
                    <p>
                        A first-try answer earns 100 points, then 80, 60, 40, 20 and 10. Normal pays 1.5x and In a
                        beat pays double.
                    </p>
                </section>

                <section className="help-block">
                    <h3>Ways to play</h3>
                    <ul className="help-modes">
                        <li>
                            <strong>Daily</strong> A new song every day in Pop, Hip-Hop, Rock, Bollywood, Latin and K-Pop. Play the ones you know and keep your streak alive.
                        </li>
                        <li>
                            <strong>Packs</strong> Ten songs from a chart, decade or genre.
                        </li>
                        <li>
                            <strong>Party</strong> Make a room and play live with friends. Everyone hears the same clip; fastest wins.
                        </li>
                        <li>
                            <strong>Artists</strong> How well do you know your favourite artist?
                        </li>
                        <li>
                            <strong>Challenges</strong> Build your own quiz and send the link to friends.
                        </li>
                    </ul>
                </section>

                <section className="help-block help-keys">
                    <h3>Shortcuts</h3>
                    <p>
                        <kbd>Space</kbd> play the clip, <kbd>Enter</kbd> next song, <kbd>&uarr;</kbd>
                        <kbd>&darr;</kbd> pick a suggestion.
                    </p>
                </section>

                <button type="button" className="btn btn--primary btn--block btn--lg" onClick={onClose}>
                    Got it
                </button>
            </div>
        </Dialog>
    );
}
