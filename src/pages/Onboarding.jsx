import React, { useState } from 'react';
import { setProfile } from '../services/profile';

const Onboarding = ({ onDone }) => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [error, setError] = useState('');

    const handleStart = () => {
        const trimmed = name.trim();
        if (!trimmed) return setError('Please enter your name.');
        const ageNum = parseInt(age, 10);
        if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) return setError('Please enter a valid age.');

        setProfile({ name: trimmed.slice(0, 24), age: ageNum });
        onDone();
    };

    return (
        <div className="login-page">
            <p className="login-eyebrow">Welcome</p>
            <h1 className="login-title">
                Guess in a<br />
                <span className="login-title-beat">Beat</span>
            </h1>
            <p className="login-tagline">Tell us a little about you to get started.</p>

            <div className="setup-card" style={{ maxWidth: 360, marginTop: '1rem' }}>
                <div className="field">
                    <label className="field-label" htmlFor="onboard-name">Your Name</label>
                    <input
                        id="onboard-name"
                        type="text"
                        className="field-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex"
                        maxLength={24}
                        onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                        autoFocus
                    />
                </div>
                <div className="field">
                    <label className="field-label" htmlFor="onboard-age">Age</label>
                    <input
                        id="onboard-age"
                        type="number"
                        className="field-input"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 21"
                        min="1"
                        max="120"
                        style={{ maxWidth: 160 }}
                        onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                    />
                </div>

                {error && <div className="setup-error">{error}</div>}

                <button className="btn-primary" onClick={handleStart}>Enter the Studio</button>
            </div>
        </div>
    );
};

export default Onboarding;
