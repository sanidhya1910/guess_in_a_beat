import React from 'react';
import { SpotifyIcon } from './Icons';

const Login = () => {
    const handleLogin = () => {
        window.location.href = 'http://127.0.0.1:5000/auth/login';
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

            <div className="login-cta">
                <button className="login-btn" onClick={handleLogin}>
                    <SpotifyIcon size={19} />
                    Continue with Spotify
                </button>

                <p className="login-note">
                    Requires Spotify Premium for full playback.
                    30-second previews work without Premium.
                </p>
            </div>
        </div>
    );
};

export default Login;
