import { useEffect } from 'react';
import { useUi } from '../app/ui-context';
import { Link } from '../lib/Link';

const FAQ: { q: string; a: string }[] = [
    {
        q: 'I pressed play and heard nothing.',
        a: 'Check your volume in Settings and on your device. On iPhone, also check the silent switch. Very short clips (0.1 seconds on In a beat) are easy to miss, so try Normal first.',
    },
    {
        q: 'Why is a song missing, or why did one get skipped?',
        a: 'Not every song has a preview in every country. When a preview will not load, the game swaps in another song so your round keeps going.',
    },
    {
        q: 'Can I play my own Spotify playlist?',
        a: 'Not right now. Spotify restricts its developer API to a handful of approved users per app, so a public game cannot read playlists. Use Create a challenge to build your own list instead.',
    },
    {
        q: 'Is it really free?',
        a: 'Yes. There are no accounts, subscriptions or ads. Music comes from the free 30-second previews Apple publishes for every song in its store.',
    },
    {
        q: 'My guess was right but marked wrong.',
        a: 'Pick the song from the suggestion list. Live versions, remasters and features of the right song all count, and a yellow square means you had the right artist or title.',
    },
];

export default function AboutPage() {
    const { openDialog } = useUi();

    useEffect(() => {
        const id = window.location.hash.slice(1);
        if (id) document.getElementById(id)?.scrollIntoView();
    }, []);

    return (
        <article className="page about">
            <header className="list-head">
                <h1>About Guess in a Beat</h1>
                <p>A music quiz where the clips start tiny and the scores reward a quick ear.</p>
            </header>

            <section className="about-section">
                <h2>How it works</h2>
                <p>
                    Each round plays a few seconds of a song, starting as short as a tenth of a second. Every wrong guess or skip unlocks a
                    longer clip. Name it sooner to score more. Play the Daily for one shared song a day, run through a pack of hits, quiz
                    yourself on an artist, or build a challenge for friends.
                </p>
                <button type="button" className="btn btn--secondary" onClick={() => openDialog('help')}>
                    Read the rules
                </button>
            </section>

            <section className="about-section">
                <h2>Where the music comes from</h2>
                <p>
                    Clips are the 30-second previews Apple makes public for songs in the Apple Music and iTunes catalog. They stream straight
                    from Apple to your browser through the free iTunes Search API, so nobody needs an account or subscription to play. Every
                    reveal links to the full song on Apple Music, Spotify and YouTube.
                </p>
            </section>

            <section className="about-section" id="privacy">
                <h2>Privacy</h2>
                <p>
                    There are no accounts, cookies, ads or analytics. Your settings, streak and scores are saved in your own browser and never
                    leave it. Song searches and previews are requested from Apple&rsquo;s servers, which see your IP address as with any
                    website. Challenge links only contain song ids, a score and the game settings.
                </p>
            </section>

            <section className="about-section">
                <h2>Questions</h2>
                <div className="faq">
                    {FAQ.map((item) => (
                        <details key={item.q}>
                            <summary>{item.q}</summary>
                            <p>{item.a}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="about-section">
                <h2>Credits</h2>
                <p>
                    Song previews and artwork courtesy of Apple Music. Guess in a Beat is an independent fan project and is not affiliated with
                    or endorsed by Apple, Spotify or any artist or label. All music belongs to its respective owners.
                </p>
                <Link to="/" className="btn btn--primary">
                    Start playing
                </Link>
            </section>
        </article>
    );
}
