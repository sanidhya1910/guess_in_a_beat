import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../components/Login';
import Setup from '../components/Setup';
import Game from '../components/Game';
import { ArrowLeftIcon } from '../components/Icons';
import { getToken, logout } from '../services/spotify';

// Only Spotify needs a real login/session — the other providers work off a
// pasted link or a search, no auth at all.
const NO_AUTH_PROVIDERS = ['apple', 'deezer', 'itunes'];

function SoloApp() {
    const navigate = useNavigate();
    const [provider, setProvider]     = useState(null); // 'spotify' | 'apple' | 'deezer' | 'itunes' | null
    const [token, setToken]           = useState(null);
    const [tracks, setTracks]         = useState([]);
    const [gameStarted, setGameStarted] = useState(false);
    const [loading, setLoading]       = useState(true);
    const [serverDown, setServerDown] = useState(false);

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const accessToken = await getToken();
                if (accessToken) {
                    setToken(accessToken);
                    setProvider('spotify');
                }
            } catch (e) {
                if (e.code === 'AUTH_SERVER_UNREACHABLE') setServerDown(true);
            } finally {
                setLoading(false);
            }
        };
        fetchToken();
    }, []);

    const handleSelectProvider = (selected) => {
        setProvider(selected);
    };

    const handleStartGame = (playlistTracks) => {
        setTracks(playlistTracks);
        setGameStarted(true);
    };

    const handleExit = () => {
        setGameStarted(false);
        setTracks([]);
    };

    const handleLogout = async () => {
        if (provider === 'spotify') await logout();
        setToken(null);
        setProvider(null);
        setGameStarted(false);
        setTracks([]);
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner loading-spinner" />
                <span>Connecting to Spotify…</span>
            </div>
        );
    }

    const isReady = provider && (NO_AUTH_PROVIDERS.includes(provider) || token);

    if (!isReady) {
        return (
            <>
                <button className="back-link" onClick={() => navigate('/')}>
                    <ArrowLeftIcon size={16} /> Back
                </button>
                <Login serverDown={serverDown} onSelectProvider={handleSelectProvider} />
            </>
        );
    }

    if (!gameStarted) {
        return (
            <>
                <Setup provider={provider} token={token} onStartGame={handleStartGame} />
                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </>
        );
    }

    return <Game provider={provider} token={token} tracks={tracks} onExit={handleExit} />;
}

export default SoloApp;
