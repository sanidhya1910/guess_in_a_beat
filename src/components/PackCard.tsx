import { recordKey, recordsStore, settingsStore } from '../lib/state';
import { useStore } from '../lib/store';
import { Link } from '../lib/Link';
import type { PackInfo } from '../lib/types';
import { CoverGrid } from './CoverGrid';

export function PackCard({ pack, variant = 'grid' }: { pack: PackInfo; variant?: 'grid' | 'wide' | 'tall' }) {
    const { difficulty } = useStore(settingsStore);
    const best = useStore(recordsStore).packs[recordKey(pack.id, difficulty)]?.best;

    return (
        <Link to={`/play/${pack.id}`} className={`pack-card pack-card--${variant}`}>
            <CoverGrid covers={pack.covers} size={variant === 'wide' ? 220 : 260} className="pack-card-art" />
            <span className="pack-card-body">
                <span className="pack-card-title">{pack.title}</span>
                <span className="pack-card-blurb">{pack.blurb}</span>
                <span className="pack-card-meta">
                    <span className="mono">{pack.count}</span> songs
                    {best ? (
                        <>
                            <span aria-hidden="true"> / </span>best <span className="mono">{best}</span>
                        </>
                    ) : null}
                </span>
            </span>
        </Link>
    );
}
