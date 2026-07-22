import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '../components/Icons';

const PlayChooser = () => {
    const navigate = useNavigate();

    return (
        <div className="login-page">
            <button className="back-link" onClick={() => navigate('/')}>
                <ArrowLeftIcon size={16} /> Back
            </button>

            <p className="login-eyebrow">Play With Friends</p>
            <h1 className="login-title">Party <span className="login-title-beat">Up</span></h1>
            <p className="login-tagline">
                Create a party and share the code, or join one a friend already started. 2–4 players.
            </p>

            <div className="play-choice-cta">
                <button className="login-btn" onClick={() => navigate('/play/create')}>
                    Create a Party
                </button>
                <button className="login-btn" onClick={() => navigate('/play/join')}>
                    Join a Party
                </button>
            </div>
        </div>
    );
};

export default PlayChooser;
