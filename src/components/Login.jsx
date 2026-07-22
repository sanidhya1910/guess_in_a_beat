import React from 'react';
import { SpotifyIcon, AppleMusicIcon, DeezerIcon, AppleIcon } from './Icons';

const Login = ({ serverDown, onSelectProvider }) => {
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

                <button className="login-btn login-btn--apple" onClick={() => onSelectProvider('apple')}>
                    <AppleMusicIcon size={19} color="#fff" />
                    Continue with Apple Music
                </button>

                <button className="login-btn login-btn--deezer" onClick={() => onSelectProvider('deezer')}>
                    <DeezerIcon size={19} color="#fff" />
                    Continue with Deezer
                </button>

                <button className="login-btn login-btn--itunes" onClick={() => onSelectProvider('itunes')}>
                    <AppleIcon size={17} color="#fff" />
                    Continue with iTunes (free, no account)
                </button>

                <p className="login-note">
                    Spotify requires Premium for full playback (song previews work without it).
                    Apple Music, Deezer, and iTunes need no login at all.
                </p>
            </div>
        </div>
    );
};

export default Login;
