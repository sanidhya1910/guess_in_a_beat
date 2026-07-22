import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SoloApp from './pages/SoloApp';
import PlayChooser from './pages/PlayChooser';
import CreateLobby from './pages/CreateLobby';
import JoinLobby from './pages/JoinLobby';
import LobbyRoom from './pages/LobbyRoom';
import Leaderboard from './pages/Leaderboard';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <div className="App">
                <Routes>
                    <Route path="/" element={<LandingPage />} />
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
