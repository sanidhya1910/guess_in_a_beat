import { useEffect, useMemo, useState } from 'react';
import { parseChallenge } from '../game/challenge';
import { GameSession } from '../game/GameSession';
import { CATEGORY_LABELS, getPack, loadPackSongs } from '../lib/packs';
import { useLocation } from '../lib/router';
import type { Song } from '../lib/types';
import NotFoundPage from './NotFoundPage';
import { SetupSkeleton } from './SetupSkeleton';

export default function PackPage({ params }: { params: Record<string, string> }) {
    const pack = getPack(params.id);
    const { query } = useLocation();
    const search = query.toString();
    const challenge = useMemo(() => parseChallenge(new URLSearchParams(search)), [search]);
    const [songs, setSongs] = useState<Song[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!pack) return;
        let alive = true;
        loadPackSongs(pack.id).then(
            (s) => alive && setSongs(s),
            () => alive && setFailed(true),
        );
        return () => {
            alive = false;
        };
    }, [pack]);

    if (!pack) return <NotFoundPage />;
    if (failed) {
        return (
            <div className="page page-message">
                <h1>This pack didn&rsquo;t load</h1>
                <p>Check your connection and try again.</p>
                <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
                    Retry
                </button>
            </div>
        );
    }
    if (!songs) return <SetupSkeleton />;

    const kicker =
        pack.category === 'charts' && pack.updated
            ? `Chart, updated ${new Date(`${pack.updated}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
            : CATEGORY_LABELS[pack.category].replace(/s$/, '');

    return (
        <GameSession
            recordId={pack.id}
            kicker={kicker}
            title={pack.title}
            blurb={pack.blurb}
            covers={pack.covers}
            songs={songs}
            sourceCountry={pack.country}
            shuffleSongs
            sharePath={`/play/${pack.id}`}
            challenge={challenge}
            moreLink={{ to: '/packs', label: 'Browse more packs' }}
            exitTo="/packs"
            partyPack={pack.id}
        />
    );
}
