import { LightningIcon, PlayIcon, TrophyIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { CoverGrid } from '../components/CoverGrid';
import { Segmented } from '../components/Segmented';
import { navigate } from '../lib/router';
import { randomSeed, shuffle } from '../lib/rng';
import { DIFFICULTIES, formatSeconds } from '../lib/scoring';
import { siteUrl } from '../lib/share';
import { recordKey, recordsStore, saveGame, settingsStore } from '../lib/state';
import { useStore } from '../lib/store';
import type { Difficulty, Song } from '../lib/types';
import { GameView } from './GameView';
import { initGame, type GameState } from './reducer';
import { Summary } from './Summary';

export interface Challenge {
    seed?: string;
    difficulty?: Difficulty;
    rounds?: number;
    score?: number;
}

interface GameSessionProps {
    /** Stable id for best-score records ("80s", "artist-1234", ...). */
    recordId: string;
    kicker: string;
    title: string;
    blurb?: string;
    covers: string[];
    songs: Song[];
    /** Storefront the songs came from. */
    sourceCountry: string;
    /** Shuffle songs with the seed, so a shared link replays the same order, or keep the given order. */
    shuffleSongs: boolean;
    /** Path (with any query) friends open to play the same game. */
    sharePath: string;
    challenge: Challenge;
    moreLink: { to: string; label: string };
    exitTo: string;
    /** Offer playing every song as a round choice, and start with it (custom challenges). */
    allRounds?: boolean;
    /** Pack id, to offer starting a multiplayer room with it. */
    partyPack?: string;
}

const ROUND_CHOICES = [5, 10, 15, 20];

function withParams(path: string, params: Record<string, string | number>): string {
    const [base, query = ''] = path.split('?');
    const q = new URLSearchParams(query);
    for (const [k, v] of Object.entries(params)) q.set(k, String(v));
    return `${base}?${q}`;
}

export function GameSession(props: GameSessionProps) {
    const { recordId, kicker, title, blurb, covers, songs, sourceCountry, shuffleSongs, sharePath, challenge, moreLink, exitTo, allRounds, partyPack } =
        props;
    const settings = useStore(settingsStore);
    const records = useStore(recordsStore);
    const isChallenge = challenge.score !== undefined;

    const roundChoices = allRounds
        ? [...ROUND_CHOICES.filter((n) => n < songs.length), songs.length]
        : ROUND_CHOICES.filter((n) => n <= songs.length);
    const fallbackRounds = allRounds ? songs.length : Math.min(settings.rounds, songs.length);
    const [difficulty, setDifficulty] = useState<Difficulty>(challenge.difficulty ?? settings.difficulty);
    const [rounds, setRounds] = useState(Math.min(challenge.rounds ?? fallbackRounds, songs.length));
    const [run, setRun] = useState<{ seed: string; initial: GameState; key: number } | null>(null);
    const [result, setResult] = useState<{ isBest: boolean } | null>(null);
    const savedRun = useRef(-1);

    const key = recordKey(recordId, difficulty);
    const best = records.packs[key]?.best ?? 0;

    const start = (seed: string) => {
        const queue = shuffleSongs ? shuffle(songs, seed) : songs;
        setResult(null);
        setRun({ seed, initial: initGame(queue, rounds, difficulty), key: Date.now() });
    };

    if (run) {
        const link = siteUrl(withParams(sharePath, { seed: run.seed, d: difficulty, n: rounds }));
        return (
            <GameView
                key={run.key}
                title={title}
                initial={run.initial}
                pool={songs}
                country={settings.region}
                sourceCountry={sourceCountry}
                onExit={() => navigate(exitTo)}
                onChange={(state) => {
                    if (state.phase !== 'finished' || savedRun.current === run.key) return;
                    savedRun.current = run.key;
                    const correct = state.results.filter((r) => r.won).length;
                    setResult({ isBest: saveGame(key, title, state.score, state.results.length, correct) });
                }}
                renderFinished={(state) => (
                    <Summary
                        title={title}
                        state={state}
                        isBest={!!result?.isBest}
                        best={Math.max(best, state.score)}
                        challengeScore={challenge.score}
                        challengeLink={`${link}&s=${state.score}`}
                        onPlayAgain={() => {
                            // A rematch gets fresh songs rather than the friend's seed.
                            if (isChallenge) navigate(sharePath, { replace: true });
                            setRun(null);
                        }}
                        moreLink={moreLink}
                    />
                )}
            />
        );
    }

    const ladder = DIFFICULTIES[difficulty].ladder;

    return (
        <section className="setup page">
            <div className="setup-hero">
                <CoverGrid covers={covers} size={300} className="setup-covers" />
                <div className="setup-intro">
                    <p className="setup-kicker">{kicker}</p>
                    <h1 className="setup-title">{title}</h1>
                    {blurb && <p className="setup-blurb">{blurb}</p>}
                    <p className="setup-meta">
                        <span>
                            <span className="mono">{songs.length}</span> songs
                        </span>
                        {best > 0 && (
                            <>
                                <span aria-hidden="true"> / </span>
                                <TrophyIcon size={15} weight="fill" />
                                <span>
                                    Best <span className="mono">{best}</span>
                                </span>
                            </>
                        )}
                    </p>
                </div>
            </div>

            <div className="setup-panel">
                {isChallenge && (
                    <div className="setup-challenge">
                        <LightningIcon size={22} weight="fill" />
                        <p>
                            A friend scored <strong className="mono">{challenge.score}</strong> on these exact songs. Your turn.
                        </p>
                    </div>
                )}

                <div className="field">
                    <span className="field-label" id="setup-diff">
                        Difficulty
                    </span>
                    {isChallenge ? (
                        <p className="setup-locked">
                            {DIFFICULTIES[difficulty].label}, {rounds} songs, same as your friend
                        </p>
                    ) : (
                        <Segmented<Difficulty>
                            labelledBy="setup-diff"
                            value={difficulty}
                            options={Object.values(DIFFICULTIES).map((d) => ({ value: d.id, label: d.label }))}
                            onChange={setDifficulty}
                        />
                    )}
                    <ol className="ladder ladder--inline" aria-label="Snippet lengths">
                        {ladder.map((s, i) => (
                            <li key={i} className="mono">
                                {formatSeconds(s)}
                            </li>
                        ))}
                    </ol>
                </div>

                {!isChallenge && roundChoices.length > 1 && (
                    <div className="field">
                        <span className="field-label" id="setup-rounds">
                            Songs
                        </span>
                        <Segmented<number>
                            labelledBy="setup-rounds"
                            value={rounds}
                            options={roundChoices.map((n) => ({ value: n, label: allRounds && n === songs.length ? `All ${n}` : String(n) }))}
                            onChange={setRounds}
                        />
                    </div>
                )}

                <button
                    type="button"
                    className="btn btn--primary btn--lg btn--block"
                    onClick={() => start(challenge.seed ?? randomSeed())}
                    disabled={songs.length === 0}
                >
                    <PlayIcon size={18} weight="fill" /> {isChallenge ? 'Accept challenge' : 'Start game'}
                </button>
                {partyPack && !isChallenge && (
                    <button type="button" className="btn btn--secondary btn--lg btn--block" onClick={() => navigate(`/party?pack=${partyPack}`)}>
                        <UsersThreeIcon size={18} weight="fill" /> Play with friends
                    </button>
                )}
            </div>
        </section>
    );
}
