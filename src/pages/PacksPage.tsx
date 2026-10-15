import { useState } from 'react';
import { PackCard } from '../components/PackCard';
import { CATEGORY_LABELS, PACKS } from '../lib/packs';
import type { PackCategory } from '../lib/types';

const FILTERS: (PackCategory | 'all')[] = ['all', 'charts', 'decades', 'genres'];

export default function PacksPage() {
    const [filter, setFilter] = useState<PackCategory | 'all'>('all');
    const packs = filter === 'all' ? PACKS : PACKS.filter((p) => p.category === filter);

    return (
        <section className="page list-page">
            <header className="list-head">
                <h1>Song packs</h1>
                <p>Ten songs a game from a chart, a decade or a genre. Pick one and see how fast you are.</p>
            </header>
            <div className="chips" role="group" aria-label="Filter packs">
                {FILTERS.map((f) => (
                    <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                        {f === 'all' ? 'All' : CATEGORY_LABELS[f]}
                    </button>
                ))}
            </div>
            <div className="genre-grid packs-grid">
                {packs.map((p) => (
                    <PackCard key={p.id} pack={p} />
                ))}
            </div>
        </section>
    );
}
