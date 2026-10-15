import { useEffect, useMemo, useState } from 'react';
import { parseChallenge } from '../game/challenge';
import { GameSession } from '../game/GameSession';
import { artistSongs } from '../lib/itunes';
import { Link } from '../lib/Link';
import { useLocation } from '../lib/router';
import { settingsStore } from '../lib/state';
import type { Song } from '../lib/types';
import { SetupSkeleton } from './SetupSkeleton';

const MIN_SONGS = 5;

export default function ArtistPage({ params }: { params: Record<string, string> }) {
    const artistId = Number(params.id);
    const { query } = useLocation();
    const search = query.toString();
    const challenge = useMemo(() => parseChallenge(new URLSearchParams(search)), [search]);
    const cc = /^[a-z]{2}$/.test(query.get('cc') ?? '') ? query.get('cc')! : settingsStore.get().region;
    const [data, setData] = useState<{ name: string; songs: Song[] } | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!Number.isInteger(artistId) || artistId <= 0) return;
        let alive = true;
        artistSongs(artistId, cc).then(
            (d) => alive && setData(d),
            (err: Error) => alive && setError(err.name === 'RateLimitError' ? err.message : 'Could not reach the music catalog.'),
        );
        return () => {
            alive = false;
        };
    }, [artistId, cc]);

    const covers = useMemo(() => {
        const seen = new Set<string>();
        return (data?.songs ?? []).map((s) => s.artwork).filter((a) => a && !seen.has(a) && seen.add(a)).slice(0, 4);
    }, [data]);

    const invalid = !Number.isInteger(artistId) || artistId <= 0;
    if (invalid || error || (data && data.songs.length < MIN_SONGS)) {
        return (
            <div className="page page-message">
                <h1>{error ? 'Something went wrong' : 'Not enough songs'}</h1>
                <p>
                    {error ||
                        (invalid
                            ? 'That artist link looks broken.'
                            : `We found only ${data?.songs.length ?? 0} songs with previews for ${data?.name ?? 'this artist'}. Try another artist.`)}
                </p>
                <Link to="/artists" className="btn btn--primary">
                    Pick another artist
                </Link>
            </div>
        );
    }
    if (!data) return <SetupSkeleton />;

    return (
        <GameSession
            recordId={`artist-${artistId}`}
            kicker="Artist mode"
            title={data.name}
            blurb={`${data.songs.length} of their most played songs. How many can you name?`}
            covers={covers}
            songs={data.songs}
            sourceCountry={cc}
            shuffleSongs
            sharePath={`/artist/${artistId}?cc=${cc}`}
            challenge={challenge}
            moreLink={{ to: '/artists', label: 'Pick another artist' }}
            exitTo="/artists"
        />
    );
}
