import axios from 'axios';

const API_BASE = 'http://127.0.0.1:5000';
const SPOTIFY_API = 'https://api.spotify.com/v1';

export const getToken = async () => {
    try {
        const response = await axios.get(`${API_BASE}/auth/token`, {
            withCredentials: true
        });
        return response.data.access_token;
    } catch (error) {
        return null;
    }
};

export const logout = async () => {
    await axios.get(`${API_BASE}/auth/logout`, {
        withCredentials: true
    });
};

export const getPlaylistTracks = async (token, playlistId) => {
    try {
        let allTracks = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        // Paginate through all tracks
        while (hasMore) {
            const response = await axios.get(`${SPOTIFY_API}/playlists/${playlistId}/tracks`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: {
                    limit,
                    offset,
                    market: 'from_token'
                }
            });

            const items = response.data.items;
            const tracks = items.map(item => item.track).filter(track => track && track.uri);
            allTracks = [...allTracks, ...tracks];
            
            offset += limit;
            hasMore = response.data.next !== null;
            
            console.log(`Fetched ${allTracks.length} tracks so far...`);
        }

        console.log(`Total: ${allTracks.length} tracks from playlist`);
        return allTracks;
    } catch (error) {
        console.error('Error fetching playlist tracks:', error);
        throw error;
    }
};

export const getSeveralTracks = async (token, trackIds) => {
    try {
        const chunks = [];
        for (let i = 0; i < trackIds.length; i += 50) {
            chunks.push(trackIds.slice(i, i + 50));
        }

        let allTracks = [];
        for (const chunk of chunks) {
            const response = await axios.get(`${SPOTIFY_API}/tracks`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: {
                    ids: chunk.join(','),
                    market: 'from_token'
                }
            });
            allTracks = [...allTracks, ...response.data.tracks];
        }

        const validTracks = allTracks.filter(track => track && track.uri);
        console.log(`Fetched ${validTracks.length} tracks`);
        return validTracks;

    } catch (error) {
        console.error('Error fetching tracks:', error);
        throw error;
    }
};

export const searchTracks = async (token, query) => {
    try {
        const response = await axios.get(`${SPOTIFY_API}/search`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            params: {
                q: query,
                type: 'track',
                limit: 10,
                market: 'from_token'
            }
        });
        return response.data.tracks.items;
    } catch (error) {
        console.error('Error searching tracks:', error);
        throw error;
    }
};

export const playTrack = async (token, trackUri, positionMs = 0) => {
    try {
        // First, check for available devices
        const devices = await getActiveDevices(token);
        console.log('Available devices:', devices);

        if (!devices || devices.length === 0) {
            throw new Error('NO_DEVICES: No Spotify devices found. Please open Spotify on your computer or phone.');
        }

        // Find an active device, or use the first available one
        let targetDevice = devices.find(d => d.is_active);
        if (!targetDevice) {
            targetDevice = devices[0];
            console.log('No active device, transferring playback to:', targetDevice.name);
            
            // Transfer playback to the device first
            await axios.put(
                `${SPOTIFY_API}/me/player`,
                {
                    device_ids: [targetDevice.id],
                    play: false
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
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
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('Playing on device:', targetDevice.name);
    } catch (error) {
        console.error('Error playing track:', error);
        throw error;
    }
};

export const pausePlayback = async (token) => {
    try {
        await axios.put(
            `${SPOTIFY_API}/me/player/pause`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            }
        );
    } catch (error) {
        console.error('Error pausing playback:', error);
        throw error;
    }
};

export const getActiveDevices = async (token) => {
    try {
        const response = await axios.get(`${SPOTIFY_API}/me/player/devices`, {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        });
        return response.data.devices;
    } catch (error) {
        console.error('Error getting devices:', error);
        throw error;
    }
};
