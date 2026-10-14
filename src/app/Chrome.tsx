import {
    CalendarCheckIcon,
    ChartBarIcon,
    GearSixIcon,
    HouseIcon,
    MicrophoneStageIcon,
    PlusCircleIcon,
    QuestionIcon,
    SquaresFourIcon,
    UsersThreeIcon,
    type Icon,
} from '@phosphor-icons/react';
import { LogoMark } from '../components/Logo';
import { Link } from '../lib/Link';
import { useUi } from './ui-context';

const NAV: { to: string; label: string; icon: Icon; match: (p: string) => boolean }[] = [
    { to: '/daily', label: 'Daily', icon: CalendarCheckIcon, match: (p) => p === '/daily' },
    { to: '/packs', label: 'Packs', icon: SquaresFourIcon, match: (p) => p === '/packs' || p.startsWith('/play/') },
    { to: '/party', label: 'Party', icon: UsersThreeIcon, match: (p) => p === '/party' || p.startsWith('/room/') },
    { to: '/artists', label: 'Artists', icon: MicrophoneStageIcon, match: (p) => p.startsWith('/artist') },
    { to: '/create', label: 'Create', icon: PlusCircleIcon, match: (p) => p === '/create' || p === '/c' },
];

export function Header({ path }: { path: string }) {
    const { openDialog } = useUi();
    return (
        <header className="site-header">
            <div className="page site-header-row">
                <Link to="/" className="brand" aria-label="Guess in a Beat, home">
                    <LogoMark />
                    <span className="brand-name">Guess in a Beat</span>
                </Link>
                <nav className="site-nav" aria-label="Main">
                    {NAV.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className="site-nav-link"
                            aria-current={item.match(path) ? 'page' : undefined}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="site-actions">
                    <button type="button" className="icon-btn" aria-label="How to play" onClick={() => openDialog('help')}>
                        <QuestionIcon size={22} />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Your stats" onClick={() => openDialog('stats')}>
                        <ChartBarIcon size={22} />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Settings" onClick={() => openDialog('settings')}>
                        <GearSixIcon size={22} />
                    </button>
                </div>
            </div>
        </header>
    );
}

export function TabBar({ path }: { path: string }) {
    const items = [{ to: '/', label: 'Home', icon: HouseIcon, match: (p: string) => p === '/' }, ...NAV];
    return (
        <nav className="tabbar" aria-label="Main">
            {items.map((item) => {
                const active = item.match(path);
                const ItemIcon = item.icon;
                return (
                    <Link key={item.to} to={item.to} className="tabbar-link" aria-current={active ? 'page' : undefined}>
                        <ItemIcon size={24} weight={active ? 'fill' : 'regular'} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

export function Footer() {
    const { openDialog } = useUi();
    return (
        <footer className="site-footer">
            <div className="page site-footer-row">
                <div className="site-footer-brand">
                    <LogoMark size={24} />
                    <p>
                        Free to play. No account, no ads.
                        <br />
                        Song previews courtesy of Apple Music.
                    </p>
                </div>
                <nav className="site-footer-links" aria-label="Footer">
                    <button type="button" onClick={() => openDialog('help')}>
                        How to play
                    </button>
                    <Link to="/about">About</Link>
                    <Link to="/about#privacy">Privacy</Link>
                    <Link to="/create">Create a challenge</Link>
                </nav>
            </div>
            <p className="page site-footer-legal">
                Not affiliated with Apple, Spotify or any artist or label. All songs and artwork belong to their owners.
            </p>
        </footer>
    );
}
