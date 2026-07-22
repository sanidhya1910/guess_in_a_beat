import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SpotifyIcon, AppleMusicIcon, DeezerIcon, AppleIcon } from './Icons';

const Login = ({ serverDown, onSelectProvider }) => {
    // Which providers the server can actually use — Apple Music needs paid
    // developer credentials, so it may be unavailable.
    const [available, setAvailable] = useState({ spotify: true, apple: true, deezer: true, itunes: true });

    useEffect(() => {
        axios
            .get('/api/providers')
            .then(({ data }) => setAvailable(data))
            .catch(() => {}); // keep optimistic defaults if the check fails
    }, []);

    const handleLogin = () => {
        window.location.href = '/auth/login';
    };

    return (
        <div className="login-page">
            <p className="login-eyebrow">Music Knowledge Test</p>

            <h1 className="login-title">
                Guess in a<br />
                <span className="login-title-beat">Beat</span>
            </h1>

            <p className="login-tagline">
                Identify songs from clips as short as 0.1 seconds.
                Six chances. Fewer seconds, more points.
            </p>

            {serverDown && (
                <div className="login-error" role="alert">
                    <strong>Can’t reach the login server.</strong>
                    Start the app with <code>npm run dev</code>, then reload this page.
                </div>
            )}

            <div className="login-cta">
                <button className="login-btn login-btn--spotify" onClick={handleLogin} disabled={serverDown}>
                    <SpotifyIcon size={19} color="#000" />
                    Continue with Spotify
                </button>

                {available.apple ? (
                    <button className="login-btn login-btn--apple" onClick={() => onSelectProvider('apple')}>
                        <AppleMusicIcon size={19} color="#fff" />
                        Continue with Apple Music
                    </button>
                ) : (
                    <button className="login-btn login-btn--apple" disabled title="Apple Music needs an Apple Developer account configured on the server">
                        <AppleMusicIcon size={19} color="#fff" />
                        Apple Music (not set up)
                    </button>
                )}

                <button className="login-btn login-btn--deezer" onClick={() => onSelectProvider('deezer')}>
                    <DeezerIcon size={19} color="#fff" />
                    Continue with Deezer
                </button>

                <button className="login-btn login-btn--itunes" onClick={() => onSelectProvider('itunes')}>
                    <AppleIcon size={17} color="#fff" />
                    Continue with iTunes (free, no account)
                </button>

                <p className="login-note">
                    {available.apple
                        ? 'Spotify requires Premium for full playback (song previews work without it). Apple Music, Deezer, and iTunes need no login at all.'
                        : 'Deezer and iTunes are free and need no login — start there. Apple Music isn’t set up on this server (it needs a paid Apple Developer account).'}
                </p>
            </div>
        </div>
    );
};

export default Login;
