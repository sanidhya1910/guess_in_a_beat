import { useEffect, useMemo, useState } from 'react';
import { parseChallenge } from '../game/challenge';
import { GameSession } from '../game/GameSession';
import { customPath, MAX_CUSTOM_SONGS } from '../lib/custom';
import { lookupSongs } from '../lib/itunes';
import { Link } from '../lib/Link';
import { useLocation } from '../lib/router';
import type { Song } from '../lib/types';
import { SetupSkeleton } from './SetupSkeleton';

export default function CustomPage() {
    const { query } = useLocation();
    const search = query.toString();
    const challenge = useMemo(() => parseChallenge(new URLSearchParams(search)), [search]);
    const title = (query.get('t') ?? '').slice(0, 80) || 'Custom challenge';
    const cc = /^[a-z]{2}$/.test(query.get('cc') ?? '') ? query.get('cc')! : 'us';
    const idList = query.get('ids') ?? '';
    const ids = useMemo(
        () =>
            [...new Set(idList.split(',').map(Number))]
                .filter((n) => Number.isInteger(n) && n > 0)
                .slice(0, MAX_CUSTOM_SONGS),
        [idList],
    );
    const [songs, setSongs] = useState<Song[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!ids.length) return;
        let alive = true;
        lookupSongs(ids, cc).then(
            (found) => alive && setSongs(found.filter((s) => s.preview)),
            (err: Error) => alive && setError(err.name === 'RateLimitError' ? err.message : 'Could not reach the music catalog.'),
        );
        return () => {
            alive = false;
        };
    }, [ids, cc]);

    if (!ids.length || error || (songs && songs.length === 0)) {
        return (
            <div className="page page-message">
                <h1>{error ? 'Something went wrong' : 'This challenge is empty'}</h1>
                <p>{error || 'The link has no playable songs. Ask your friend to send it again, or make your own.'}</p>
                <Link to="/create" className="btn btn--primary">
                    Create a challenge
                </Link>
            </div>
        );
    }
    if (!songs) return <SetupSkeleton />;

    const covers = [...new Set(songs.map((s) => s.artwork))].slice(0, 4);
    const sharePath = customPath(title, cc, songs.map((s) => s.id));

    return (
        <GameSession
            recordId={`custom-${ids.slice(0, 6).join('-')}`}
            kicker="Challenge"
            title={title}
            blurb={songs.length < ids.length ? `${ids.length - songs.length} songs were unavailable and left out.` : undefined}
            covers={covers}
            songs={songs}
            sourceCountry={cc}
            shuffleSongs={false}
            lockRounds
            sharePath={sharePath}
            challenge={challenge}
            moreLink={{ to: '/create', label: 'Make your own challenge' }}
            exitTo="/"
        />
    );
}
