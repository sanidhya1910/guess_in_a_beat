import React from 'react';
import { useNavigate } from 'react-router-dom';
import StudioHeader from '../components/StudioHeader';

const LandingPage = ({ profile }) => {
    const navigate = useNavigate();

    return (
        <div className="login-page">
            <StudioHeader profile={profile} />

            <p className="login-eyebrow">Music Knowledge Test</p>

            <h1 className="login-title">
                Guess in a<br />
                <span className="login-title-beat">Beat</span>
            </h1>

            <p className="login-tagline">
                Identify songs from clips as short as 0.1 seconds.
                Six chances. Fewer seconds, more points.
            </p>

            <div className="landing-cta">
                <button className="login-btn" onClick={() => navigate('/solo')}>
                    Play Solo
                </button>
                <button className="login-btn" onClick={() => navigate('/play')}>
                    Play with Friends
                </button>
            </div>
        </div>
    );
};

export default LandingPage;
