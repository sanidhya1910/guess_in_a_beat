import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SoloApp from './pages/SoloApp';
import PlayChooser from './pages/PlayChooser';
import CreateLobby from './pages/CreateLobby';
import JoinLobby from './pages/JoinLobby';
import LobbyRoom from './pages/LobbyRoom';
import Leaderboard from './pages/Leaderboard';
import Onboarding from './pages/Onboarding';
import { getProfile } from './services/profile';
import './App.css';

function App() {
    // First visit asks for name + age; after that we go straight to the studio.
    const [profile, setProfileState] = useState(() => getProfile());

    if (!profile) {
        return (
            <div className="App">
                <Onboarding onDone={() => setProfileState(getProfile())} />
            </div>
        );
    }

    return (
        <BrowserRouter>
            <div className="App">
                <Routes>
                    <Route path="/" element={<LandingPage profile={profile} />} />
                    <Route path="/solo" element={<SoloApp />} />
                    <Route path="/play" element={<PlayChooser />} />
                    <Route path="/play/create" element={<CreateLobby />} />
                    <Route path="/play/join" element={<JoinLobby />} />
                    <Route path="/join/:code" element={<JoinLobby />} />
                    <Route path="/lobby/:code" element={<LobbyRoom />} />
                    <Route path="/results/:lobbyId" element={<Leaderboard />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;
