import React from 'react';

const Login = () => {
    const handleLogin = () => {
        window.location.href = 'http://127.0.0.1:5000/auth/login';
    };

    return (
        <div className="login-container">
            <h1>GuessInABeat</h1>
            <p>Test your music knowledge! Guess the song from short snippets.</p>
            <p className="requirement-note">
                ⚠️ Requires Spotify Premium and an active Spotify player (desktop, mobile, or web).
            </p>
            <button className="login-btn" onClick={handleLogin}>
                Login with Spotify
            </button>
        </div>
    );
};

export default Login;
