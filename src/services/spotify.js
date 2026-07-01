import axios from 'axios';

const API_BASE = 'http://127.0.0.1:5000';
const SPOTIFY_API = 'https://api.spotify.com/v1';

// Cache the token to avoid repeated requests
let cachedToken = null;

export const getToken = async () => {
    try {
        const response = await axios.get(`${API_BASE}/auth/token`, {
            withCredentials: true
        });
        cachedToken = response.data.access_token;
        return cachedToken;
    } catch (error) {
        cachedToken = null;
        return null;
    }
};

export const refreshToken = async () => {
    try {
        const response = await axios.get(`${API_BASE}/auth/refresh`, {
            withCredentials: true
        });
        cachedToken = response.data.access_token;
        return cachedToken;
    } catch (error) {
        console.error('Failed to refresh token:', error);
        cachedToken = null;
        return null;
    }
};

// Wrapper to auto-refresh token on 401 errors
const spotifyRequest = async (requestFn, token) => {
    try {
        return await requestFn(token);
    } catch (error) {
        // If we get a 401, try refreshing the token
        if (error.response?.status === 401) {
            console.log('Token expired, attempting refresh...');
            const newToken = await refreshToken();
            if (newToken) {
                // Retry the request with the new token
                return await requestFn(newToken);
            }
        }
        throw error;
    }
};

export const logout = async () => {
    await axios.get(`${API_BASE}/auth/logout`, {
        withCredentials: true
    });
    cachedToken = null;
};

export const getPlaylistTracks = async (token, playlistId) => {
    const doFetch = async (currentToken) => {
        let allTracks = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        // Paginate through all tracks
        while (hasMore) {
            const response = await axios.get(`${SPOTIFY_API}/playlists/${playlistId}/tracks`, {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                },
                params: {
                    limit,
                    offset
                }
            });

            const items = response.data.items;
            const tracks = items.map(item => item.track).filter(track => track && track.uri);
            allTracks = [...allTracks, ...tracks];

            offset += limit;
            hasMore = response.data.next !== null;
        }
        return allTracks;
    };

    try {
        return await spotifyRequest(doFetch, token);
    } catch (error) {
        console.error('Error fetching playlist tracks:', error);
        throw error;
    }
};

export const getSeveralTracks = async (token, trackIds) => {
    const doFetch = async (currentToken) => {
        const chunks = [];
        for (let i = 0; i < trackIds.length; i += 50) {
            chunks.push(trackIds.slice(i, i + 50));
        }

        let allTracks = [];
        for (const chunk of chunks) {
            const response = await axios.get(`${SPOTIFY_API}/tracks`, {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                },
                params: {
                    ids: chunk.join(',')
                }
            });
            allTracks = [...allTracks, ...response.data.tracks];
        }

        return allTracks.filter(track => track && track.uri);
    };

    try {
        return await spotifyRequest(doFetch, token);
    } catch (error) {
        console.error('Error fetching tracks:', error);
        throw error;
    }
};

export const searchTracks = async (token, query) => {
    const doSearch = async (currentToken) => {
        const response = await axios.get(`${SPOTIFY_API}/search`, {
            headers: {
                Authorization: `Bearer ${currentToken}`,
            },
            params: {
                q: query,
                type: 'track',
                limit: 10
            }
        });
        return response.data.tracks.items;
    };

    try {
        return await spotifyRequest(doSearch, token);
    } catch (error) {
        console.error('Error searching tracks:', error);
        throw error;
    }
};

export const playTrack = async (token, trackUri, positionMs = 0) => {
    const doPlay = async (currentToken) => {
        // First, check for available devices
        const devicesResponse = await axios.get(`${SPOTIFY_API}/me/player/devices`, {
            headers: {
                Authorization: `Bearer ${currentToken}`,
            }
        });
        const devices = devicesResponse.data.devices;
        if (!devices || devices.length === 0) {
            throw new Error('NO_DEVICES: No Spotify devices found. Please open Spotify on your computer or phone.');
        }

        // Find an active device, or use the first available one
        let targetDevice = devices.find(d => d.is_active);
        if (!targetDevice) {
            targetDevice = devices[0];
            
            // Transfer playback to the device first
            await axios.put(
                `${SPOTIFY_API}/me/player`,
                {
                    device_ids: [targetDevice.id],
                    play: false
                },
                {
                    headers: {
                        Authorization: `Bearer ${currentToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            // Wait a moment for transfer to complete
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Now play the track on the target device
        await axios.put(
            `${SPOTIFY_API}/me/player/play?device_id=${targetDevice.id}`,
            {
                uris: [trackUri],
                position_ms: positionMs
            },
            {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
    };

    try {
        await spotifyRequest(doPlay, token);
    } catch (error) {
        console.error('Error playing track:', error);
        throw error;
    }
};

export const pausePlayback = async (token) => {
    const doPause = async (currentToken) => {
        await axios.put(
            `${SPOTIFY_API}/me/player/pause`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                }
            }
        );
    };

    try {
        await spotifyRequest(doPause, token);
    } catch (error) {
        console.error('Error pausing playback:', error);
        throw error;
    }
};

// Get a fresh token (from cache or refresh if needed)
export const getFreshToken = async () => {
    if (cachedToken) return cachedToken;
    const token = await getToken();
    if (!token) return await refreshToken();
    return token;
};
