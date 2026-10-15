import { DIFFICULTIES } from '../lib/scoring';
import { combinedHistory, dailyStats, dailyStore, recordsStore } from '../lib/state';
import { useStore } from '../lib/store';
import type { Difficulty } from '../lib/types';
import { Dialog } from './Dialog';
import { Distribution } from './Distribution';

export function StatsDialog({ open, onClose, today }: { open: boolean; onClose(): void; today: number }) {
    const history = combinedHistory(useStore(dailyStore));
    const records = useStore(recordsStore);
    const stats = dailyStats(history, today);
    const todayRecord = history[today];
    const highlight =
        todayRecord?.outcome === 'won' ? todayRecord.marks.length - 1 : todayRecord?.outcome === 'lost' ? 6 : undefined;

    const bests = Object.entries(records.packs)
        .map(([key, rec]) => ({ key, ...rec, difficulty: key.split(':')[1] as Difficulty }))
        .filter((r) => r.best > 0)
        .sort((a, b) => b.best - a.best)
        .slice(0, 6);
    const accuracy = records.songsPlayed ? Math.round((records.songsCorrect / records.songsPlayed) * 100) : 0;

    return (
        <Dialog open={open} title="Your stats" onClose={onClose}>
            <section className="stats-section">
                <h3>Daily</h3>
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
                {stats.played > 0 ? (
                    <Distribution counts={stats.distribution} highlight={highlight} />
                ) : (
                    <p className="empty-note">Play one of today&rsquo;s songs to start your streak.</p>
                )}
            </section>

            <section className="stats-section">
                <h3>Packs, artists and challenges</h3>
                <dl className="stat-row stat-row--3">
                    <div>
                        <dt>Games</dt>
                        <dd className="mono">{records.gamesPlayed}</dd>
                    </div>
                    <div>
                        <dt>Songs named</dt>
                        <dd className="mono">{records.songsCorrect}</dd>
                    </div>
                    <div>
                        <dt>Accuracy</dt>
                        <dd className="mono">{accuracy}%</dd>
                    </div>
                </dl>
                {bests.length > 0 ? (
                    <ol className="bests">
                        {bests.map((b) => (
                            <li key={b.key}>
                                <span className="bests-title">{b.title}</span>
                                <span className="bests-diff">{DIFFICULTIES[b.difficulty]?.label}</span>
                                <span className="bests-score mono">{b.best}</span>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p className="empty-note">Your best scores show up here after your first game.</p>
                )}
            </section>
        </Dialog>
    );
}
