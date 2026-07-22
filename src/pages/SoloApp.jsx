import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../components/Login';
import Setup from '../components/Setup';
import Game from '../components/Game';
import PlaylistPicker from './PlaylistPicker';
import { ArrowLeftIcon } from '../components/Icons';
import { getToken, logout } from '../services/spotify';
import { setActiveProvider, addHistoryEntry } from '../services/profile';

// Only Spotify needs a real login/session — the other providers work off a
// pasted link or a search, no auth at all.
const NO_AUTH_PROVIDERS = ['apple', 'deezer', 'itunes'];

function SoloApp() {
    const navigate = useNavigate();
    // 'featured' = curated playlist picker (default, no login); 'custom' = the
    // paste-your-own-link flow with provider selection.
    const [mode, setMode] = useState('featured');

    const [tracks, setTracks] = useState([]);
    const [gameProvider, setGameProvider] = useState('deezer');
    const [gameStarted, setGameStarted] = useState(false);

    // Custom-flow state.
    const [provider, setProvider] = useState(null);
    const [token, setToken] = useState(null);
    const [serverDown, setServerDown] = useState(false);

    // Only try to restore a Spotify session once the user opts into the custom
    // flow — the featured picker never needs it.
    useEffect(() => {
        if (mode !== 'custom') return;
        let done = false;
        getToken()
            .then((accessToken) => {
                if (done) return;
                if (accessToken) {
                    setToken(accessToken);
                    setProvider('spotify');
                }
            })
            .catch((e) => {
                if (e.code === 'AUTH_SERVER_UNREACHABLE') setServerDown(true);
            });
        return () => {
            done = true;
        };
    }, [mode]);

    const startGame = (loadedTracks, prov) => {
        setTracks(loadedTracks);
        setGameProvider(prov);
        setActiveProvider(prov);
        setGameStarted(true);
    };

    const handleComplete = (stats) => {
        addHistoryEntry({ mode: 'solo', provider: gameProvider, ...stats });
    };

    const handleExit = () => {
        setGameStarted(false);
        setTracks([]);
    };

    const handleLogout = async () => {
        if (provider === 'spotify') await logout();
        setToken(null);
        setProvider(null);
        setMode('featured');
    };

    if (gameStarted) {
        return <Game provider={gameProvider} token={token} tracks={tracks} onExit={handleExit} onComplete={handleComplete} />;
    }

    if (mode === 'featured') {
        return <PlaylistPicker onPlay={startGame} onUseCustom={() => setMode('custom')} />;
    }

    // Custom flow: pick a provider (login for Spotify), then paste links.
    const isReady = provider && (NO_AUTH_PROVIDERS.includes(provider) || token);

    if (!isReady) {
        return (
            <>
                <button className="back-link" onClick={() => setMode('featured')}>
                    <ArrowLeftIcon size={16} /> Back to playlists
                </button>
                <Login serverDown={serverDown} onSelectProvider={setProvider} />
            </>
        );
    }

    return (
        <>
            <Setup provider={provider} token={token} onStartGame={(t) => startGame(t, provider)} />
            <button className="logout-btn" onClick={handleLogout}>
                {provider === 'spotify' ? 'Logout' : 'Back to playlists'}
            </button>
        </>
    );
}

export default SoloApp;
