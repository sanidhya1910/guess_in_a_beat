import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = 5000;

const spotify_client_id = process.env.SPOTIFY_CLIENT_ID;
const spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = 'http://127.0.0.1:5000/auth/callback';

let access_token = null;
let refresh_token = null;

app.use(cors({
    origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
    credentials: true
}));

function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

app.get('/auth/login', (req, res) => {
    const scope = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state';
    const state = generateRandomString(16);

    const auth_query_parameters = new URLSearchParams({
        response_type: 'code',
        client_id: spotify_client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
    });

    res.redirect('https://accounts.spotify.com/authorize/?' + auth_query_parameters.toString());
});

app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            new URLSearchParams({
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            }).toString(),
            {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        access_token = response.data.access_token;
        refresh_token = response.data.refresh_token;

        res.redirect('http://127.0.0.1:5173/');
    } catch (error) {
        console.error('Error getting token:', error.response?.data || error.message);
        res.status(500).send('Authentication failed');
    }
});

app.get('/auth/token', (req, res) => {
    if (access_token) {
        res.json({ access_token: access_token });
    } else {
        res.status(401).json({ error: 'No token available' });
    }
});

app.get('/auth/refresh', async (req, res) => {
    if (!refresh_token) {
        return res.status(401).json({ error: 'No refresh token available' });
    }

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            }).toString(),
            {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        access_token = response.data.access_token;
        res.json({ access_token: access_token });
    } catch (error) {
        console.error('Error refreshing token:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

app.get('/auth/logout', (req, res) => {
    access_token = null;
    refresh_token = null;
    res.json({ success: true });
});

app.listen(port, () => {
    console.log(`Auth server listening at http://localhost:${port}`);
});
