import { AppleLogoIcon, ArrowRightIcon, PauseIcon, PlayIcon, SpotifyLogoIcon, YoutubeLogoIcon } from '@phosphor-icons/react';
import { useRef } from 'react';
import { audio } from '../lib/audio';
import { artworkAt } from '../lib/itunes';
import { listenLinks } from '../lib/links';
import type { Song } from '../lib/types';
import { useFrame } from './useFrame';

interface RevealCardProps {
    song: Song;
    won: boolean;
    tries: number;
    points: number;
    playing: boolean;
    canPlay: boolean;
    onTogglePlay(): void;
    onNext(): void;
    nextLabel: string;
}

export function RevealCard({ song, won, tries, points, playing, canPlay, onTogglePlay, onNext, nextLabel }: RevealCardProps) {
    const progress = useRef<HTMLDivElement>(null);
    const links = listenLinks(song);
    const art = artworkAt(song.artwork, 600);

    useFrame(playing, () => {
        const el = progress.current;
        if (!el) return;
        const t = playing ? (audio.elapsed() ?? 0) : 0;
        el.style.transform = `scaleX(${Math.min(1, t / 30)})`;
    });

    return (
        <section className={`reveal ${won ? 'is-won' : 'is-lost'}`} aria-live="polite">
            <div className="reveal-art">
                <img className="reveal-glow" src={art} alt="" aria-hidden="true" />
                <img className="art" src={art} alt={`Cover of ${song.album || song.title}`} />
            </div>

            <div className="reveal-body">
                <p className="reveal-verdict">
                    {won ? (
                        <>
                            {tries === 1 ? 'First try!' : `Got it in ${tries}`}
                            <span className="reveal-points mono">+{points}</span>
                        </>
                    ) : (
                        'The song was'
                    )}
                </p>
                <h2 className="reveal-title">{song.title}</h2>
                <p className="reveal-artist">{song.artist}</p>
                {(song.album || song.year) && (
                    <p className="reveal-album">
                        {song.album}
                        {song.album && song.year ? ', ' : ''}
                        {song.year}
                    </p>
                )}

                <div className="reveal-player">
                    <button
                        type="button"
                        className="reveal-play"
                        onClick={onTogglePlay}
                        disabled={!canPlay}
                        aria-label={playing ? 'Pause preview' : 'Play preview'}
                    >
                        {playing ? <PauseIcon size={18} weight="fill" /> : <PlayIcon size={18} weight="fill" />}
                    </button>
                    <div className="reveal-progress" aria-hidden="true">
                        <div ref={progress} className="reveal-progress-fill" />
                    </div>
                </div>

                <div className="reveal-links">
                    <a className="btn btn--ghost btn--sm" href={links.apple} target="_blank" rel="noopener noreferrer">
                        <AppleLogoIcon size={16} weight="fill" /> Apple Music
                    </a>
                    <a className="btn btn--ghost btn--sm" href={links.spotify} target="_blank" rel="noopener noreferrer">
                        <SpotifyLogoIcon size={16} weight="fill" /> Spotify
                    </a>
                    <a className="btn btn--ghost btn--sm" href={links.youtube} target="_blank" rel="noopener noreferrer">
                        <YoutubeLogoIcon size={16} weight="fill" /> YouTube
                    </a>
                </div>
            </div>

            <button type="button" className="btn btn--primary btn--lg btn--block reveal-next" onClick={onNext} autoFocus>
                {nextLabel} <ArrowRightIcon size={18} weight="bold" />
            </button>
        </section>
    );
}
