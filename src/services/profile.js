// Local player profile, score history, and active-provider indicator — all in
// this browser's localStorage (no accounts, private to the device).

const PROFILE_KEY = 'gib_profile';
const HISTORY_KEY = 'gib_history';
const PROVIDER_KEY = 'gib_active_provider';
const HISTORY_LIMIT = 50;

const read = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

export const getProfile = () => read(PROFILE_KEY, null); // { name, age } | null

export const setProfile = (profile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const clearProfile = () => localStorage.removeItem(PROFILE_KEY);

export const getHistory = () => read(HISTORY_KEY, []);

// entry: { mode, provider, score, correct, total, playlist? }
export const addHistoryEntry = (entry) => {
    const history = getHistory();
    const withMeta = { ...entry, date: new Date().toISOString() };
    const next = [withMeta, ...history].slice(0, HISTORY_LIMIT);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
};

export const clearHistory = () => localStorage.removeItem(HISTORY_KEY);

// The "currently active" music source, shown in the studio header.
export const getActiveProvider = () => read(PROVIDER_KEY, null);

export const setActiveProvider = (provider) => {
    if (provider) localStorage.setItem(PROVIDER_KEY, JSON.stringify(provider));
};

export const PROVIDER_LABELS = {
    spotify: 'Spotify',
    apple: 'Apple Music',
    deezer: 'Deezer',
    itunes: 'iTunes',
};
