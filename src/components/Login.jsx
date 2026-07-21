import React from 'react';
import { SpotifyIcon } from './Icons';

const Login = ({ serverDown }) => {
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
                <button className="login-btn" onClick={handleLogin} disabled={serverDown}>
                    <SpotifyIcon size={19} />
                    Continue with Spotify
                </button>

                <p className="login-note">
                    Requires Spotify Premium for full playback.
                    Song previews work without Premium.
                </p>
            </div>
        </div>
    );
};

export default Login;
