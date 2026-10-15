import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { HelpDialog } from '../components/HelpDialog';
import { SettingsDialog } from '../components/SettingsDialog';
import { StatsDialog } from '../components/StatsDialog';
import { audio } from '../lib/audio';
import { DAILY_EPOCH, dayIndex } from '../lib/daily';
import { matchPath, useLocation } from '../lib/router';
import { settingsStore } from '../lib/state';
import { useStore } from '../lib/store';
import AboutPage from '../pages/AboutPage';
import ArtistPage from '../pages/ArtistPage';
import ArtistsPage from '../pages/ArtistsPage';
import CreatePage from '../pages/CreatePage';
import CustomPage from '../pages/CustomPage';
import DailyPage from '../pages/DailyPage';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';
import PackPage from '../pages/PackPage';
import PacksPage from '../pages/PacksPage';
import PartyPage from '../pages/PartyPage';
import RoomPage from '../pages/RoomPage';
import { Footer, Header, TabBar } from './Chrome';
import { UiContext, type DialogName, type UiContextValue } from './ui-context';

type Page = ComponentType<{ params: Record<string, string> }>;

const ROUTES: [string, Page, string][] = [
    ['/', HomePage, 'Name That Beat: name the song in a split second'],
    ['/daily', DailyPage, 'Daily Challenge'],
    ['/daily/:category', DailyPage, 'Daily Challenge'],
    ['/packs', PacksPage, 'Song packs'],
    ['/play/:id', PackPage, 'Play'],
    ['/artists', ArtistsPage, 'Artist mode'],
    ['/artist/:id', ArtistPage, 'Artist mode'],
    ['/create', CreatePage, 'Create a challenge'],
    ['/c', CustomPage, 'Challenge'],
    ['/party', PartyPage, 'Play with friends'],
    ['/room/:code', RoomPage, 'Room'],
    ['/about', AboutPage, 'About'],
];

function resolve(path: string): { Page: Page; params: Record<string, string>; title: string } {
    for (const [pattern, Page, title] of ROUTES) {
        const params = matchPath(pattern, path);
        if (params) return { Page, params, title };
    }
    return { Page: NotFoundPage, params: {}, title: 'Not found' };
}

function useTheme() {
    const { theme, volume } = useStore(settingsStore);
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'system') root.removeAttribute('data-theme');
        else root.setAttribute('data-theme', theme);
    }, [theme]);
    useEffect(() => audio.setVolume(volume), [volume]);
}

export default function App() {
    useTheme();
    const { path } = useLocation();
    const { Page, params, title } = resolve(path);
    // First visit: explain the rules once.
    const [dialog, setDialog] = useState<DialogName | null>(() =>
        !settingsStore.get().seenHelp && path !== '/about' ? 'help' : null,
    );
    const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
    const [focusMode, setFocusMode] = useState(false);
    const toastId = useRef(0);

    useEffect(() => {
        document.title = path === '/' ? title : `${title} | Name That Beat`;
    }, [path, title]);

    // Stop any audio when leaving a page.
    useEffect(() => () => audio.stop(), [path]);

    useEffect(() => {
        if (dialog === 'help') settingsStore.set({ seenHelp: true });
    }, [dialog]);

    const toast = useCallback((message: string) => {
        const id = ++toastId.current;
        setToasts((t) => [...t.slice(-2), { id, message }]);
        window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
    }, []);

    const ui = useMemo<UiContextValue>(
        () => ({
            dialog,
            openDialog: setDialog,
            closeDialog: () => setDialog(null),
            toast,
            setFocusMode,
        }),
        [dialog, toast],
    );

    const closeDialog = () => setDialog(null);

    return (
        <UiContext.Provider value={ui}>
            <a className="skip-link" href="#main">
                Skip to content
            </a>
            <div className={`shell${focusMode ? ' shell--focus' : ''}`}>
                {!focusMode && <Header path={path} />}
                <main id="main" className="shell-main">
                    <Page key={path} params={params} />
                </main>
                {!focusMode && <Footer />}
                {!focusMode && <TabBar path={path} />}
            </div>

            <HelpDialog open={dialog === 'help'} onClose={closeDialog} />
            <StatsDialog open={dialog === 'stats'} onClose={closeDialog} today={dayIndex(DAILY_EPOCH)} />
            <SettingsDialog open={dialog === 'settings'} onClose={closeDialog} />

            <div className="toasts" role="status" aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className="toast">
                        {t.message}
                    </div>
                ))}
            </div>
        </UiContext.Provider>
    );
}
