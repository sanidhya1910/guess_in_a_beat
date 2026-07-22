import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { connectSocket, emitAck, getStoredSession, clearSession } from '../services/socket';
import { ArrowLeftIcon, CheckIcon, XIcon } from '../components/Icons';
import MultiplayerGame from './MultiplayerGame';

const LobbyRoom = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const session = getStoredSession();

    const [status, setStatus] = useState('waiting');
    const [players, setPlayers] = useState([]);
    const [provider, setProvider] = useState(null);
    const [gameData, setGameData] = useState(null); // { tracks, durations, trackIndex }
    const [error, setError] = useState('');
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        if (!session || session.code !== code) {
            navigate(`/join/${code}`);
            return;
        }

        const socket = connectSocket();

        const onLobbyState = (state) => {
            setStatus(state.status);
            setPlayers(state.players);
        };
        const onGameStart = (data) => {
            setStatus('in_progress');
            setGameData({ tracks: data.tracks, durations: data.durations, trackIndex: 0 });
        };
        const onGameOver = (data) => {
            clearSession();
            navigate(`/results/${data.lobbyId}`);
        };

        socket.on('lobby_state', onLobbyState);
        socket.on('game_start', onGameStart);
        socket.on('game_over', onGameOver);

        emitAck('rejoin_lobby', session)
            .then((res) => {
                setStatus(res.status);
                setProvider(res.provider);
                if (res.tracks) setGameData({ tracks: res.tracks, durations: res.durations, trackIndex: res.trackIndex });
            })
            .catch(() => {
                clearSession();
                navigate(`/join/${code}`);
            });

        return () => {
            socket.off('lobby_state', onLobbyState);
            socket.off('game_start', onGameStart);
            socket.off('game_over', onGameOver);
        };
    }, [code]);

    const isHost = players.find((p) => p.id === session?.playerId)?.isHost;

    const handleStart = async () => {
        setStarting(true);
        setError('');
        try {
            await emitAck('start_game', { code });
        } catch (e) {
            setError(e.message);
        } finally {
            setStarting(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard?.writeText(`${window.location.origin}/join/${code}`);
    };

    if (status === 'in_progress' && gameData && session) {
        return (
            <MultiplayerGame
                code={code}
                playerId={session.playerId}
                provider={provider}
                initialTracks={gameData.tracks}
                durations={gameData.durations}
                initialTrackIndex={gameData.trackIndex}
                players={players}
            />
        );
    }

    return (
        <div className="setup-page">
            <button className="back-link" onClick={() => navigate('/play')}>
                <ArrowLeftIcon size={16} /> Leave Party
            </button>

            <div className="setup-header">
                <h1 className="setup-title">Waiting <span>Room</span></h1>
                <p className="setup-subtitle">Share the code — game starts once everyone's in</p>
            </div>

            <div className="setup-card">
                <div className="lobby-code-display">
                    {code}
                    <button className="stepper-btn" onClick={copyLink} title="Copy invite link" style={{ width: 34, height: 34 }}>
                        ⧉
                    </button>
                </div>

                <ul className="roster-list">
                    {players.map((p) => (
                        <li key={p.id} className={`roster-item${p.connected ? '' : ' is-disconnected'}`}>
                            <span className="roster-name">
                                {p.connected ? <CheckIcon size={14} color="var(--green)" /> : <XIcon size={14} color="var(--text-2)" />}
                                {p.displayName}
                                {p.isHost && <span className="host-badge">Host</span>}
                            </span>
                        </li>
                    ))}
                </ul>

                {error && <div className="setup-error">{error}</div>}

                {isHost ? (
                    <button className="btn-primary" onClick={handleStart} disabled={starting || players.length < 2}>
                        {starting ? 'Starting…' : players.length < 2 ? 'Waiting for players…' : 'Start Game'}
                    </button>
                ) : (
                    <p className="field-hint" style={{ textAlign: 'center' }}>Waiting for the host to start the game…</p>
                )}
            </div>
        </div>
    );
};

export default LobbyRoom;
