import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Setup from './components/Setup';
import Game from './components/Game';
import { getToken, logout } from './services/spotify';
import './App.css';

function App() {
    const [token, setToken] = useState(null);
    const [tracks, setTracks] = useState([]);
    const [gameStarted, setGameStarted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchToken = async () => {
            const accessToken = await getToken();
            setToken(accessToken);
            setLoading(false);
        };
        fetchToken();
    }, []);

    const handleStartGame = (playlistTracks) => {
        setTracks(playlistTracks);
        setGameStarted(true);
    };

    const handleExit = async () => {
        setGameStarted(false);
        setTracks([]);
    };

    const handleLogout = async () => {
        await logout();
        setToken(null);
        setGameStarted(false);
        setTracks([]);
    };

    if (loading) {
        return (
            <div className="App">
                <div className="loading-screen">Loading...</div>
            </div>
        );
    }

    return (
        <div className="App">
            {!token ? (
                <Login />
            ) : !gameStarted ? (
                <div>
                    <Setup token={token} onStartGame={handleStartGame} />
                    <button className="logout-btn" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            ) : (
                <Game tracks={tracks} token={token} onExit={handleExit} />
            )}
        </div>
    );
}

export default App;
