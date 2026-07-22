import React from 'react';

export const PlayIcon = ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5.14v14.72a1 1 0 001.5.86l11.5-7.36a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z" />
    </svg>
);

export const PauseIcon = ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
);

export const SkipIcon = ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M5 5.14v13.72a1 1 0 001.5.86l9.5-6.86a1 1 0 000-1.72L6.5 4.28A1 1 0 005 5.14z" />
        <rect x="17" y="5" width="2" height="14" rx="1" />
    </svg>
);

export const ArrowLeftIcon = ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
);

export const ArrowRightIcon = ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

export const SearchIcon = ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

export const CheckIcon = ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export const XIcon = ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export const MusicIcon = ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
    </svg>
);

export const TrophyIcon = ({ size = 24, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
        <path d="M4 22h16" />
        <path d="M10 22V8a2 2 0 00-2-2H6v6a6 6 0 006 6v4" />
        <path d="M14 22V8a2 2 0 012-2h2v6a6 6 0 01-6 6v4" />
    </svg>
);

export const SpotifyIcon = ({ size = 24, color = '#1DB954' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
);

export const AppleMusicIcon = ({ size = 24, color = '#FA243C' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M23.997 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.03-.6-.39-1.26-.62-1.97-.72-.5-.07-1-.1-1.5-.1H5.9c-.28 0-.56.02-.83.05-1.19.14-2.24.62-3.11 1.49-.72.72-1.16 1.6-1.35 2.6-.06.32-.09.65-.11.98-.01.14-.01.29-.01.43v13.68c0 .17 0 .33.02.5.05.63.19 1.24.45 1.82.5 1.12 1.32 1.94 2.44 2.45.61.28 1.26.44 1.93.49.24.02.48.03.72.03h13.4c.36 0 .72-.02 1.07-.08 1.04-.16 1.96-.58 2.71-1.32.79-.78 1.26-1.73 1.42-2.83.04-.28.06-.56.06-.85V6.124zm-6.53 8.6c-.01.9-.31 1.68-.94 2.32-.5.5-1.1.79-1.79.87-.09.01-.18.02-.27.02-.5 0-.94-.14-1.29-.5-.33-.34-.49-.75-.49-1.23 0-.55.2-1.02.6-1.4.34-.32.75-.51 1.2-.62.44-.1.88-.19 1.32-.29.28-.06.4-.19.4-.48V9.164c0-.29-.13-.42-.42-.36-1.53.33-3.06.66-4.6.98-.31.06-.42.2-.42.52v6.3c0 .38-.02.75-.13 1.11-.24.79-.75 1.32-1.53 1.58-.32.11-.65.16-1 .13-.65-.06-1.15-.5-1.28-1.14a1.63 1.63 0 01.62-1.7c.32-.25.68-.4 1.07-.49.35-.08.7-.15 1.05-.24.31-.08.44-.22.44-.55V7.174c0-.4.14-.68.53-.79.36-.1.73-.18 1.1-.26 1.83-.39 3.66-.78 5.49-1.16.24-.05.48-.09.72-.06.35.04.55.25.58.6.01.1.01.2.01.3v9.46z" />
    </svg>
);

export const DeezerIcon = ({ size = 24, color = '#A238FF' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <rect x="18.5" y="4" width="4.5" height="3" />
        <rect x="18.5" y="8" width="4.5" height="3" />
        <rect x="13" y="8" width="4.5" height="3" />
        <rect x="18.5" y="12" width="4.5" height="3" />
        <rect x="13" y="12" width="4.5" height="3" />
        <rect x="7.5" y="12" width="4.5" height="3" />
        <rect x="18.5" y="16" width="4.5" height="3" />
        <rect x="13" y="16" width="4.5" height="3" />
        <rect x="7.5" y="16" width="4.5" height="3" />
        <rect x="2" y="16" width="4.5" height="3" />
    </svg>
);

export const AppleIcon = ({ size = 24, color = '#EBEBFF' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M16.365 1.43c0 1.14-.42 2.14-1.14 2.9-.79.86-2.06 1.53-3.18 1.45-.13-1.1.43-2.24 1.15-2.99.79-.86 2.16-1.51 3.17-1.36zm4.4 17.15c-.44 1.02-.97 1.98-1.68 2.87-.94 1.18-1.71 1.99-2.3 2.42-.9.68-1.87 1.03-2.9 1.05-.75.02-1.65-.21-2.7-.68-1.05-.47-2.02-.7-2.9-.7-.93 0-1.92.23-2.98.7-1.06.47-1.91.71-2.57.74-1 .04-1.98-.32-2.93-1.09-.63-.5-1.44-1.35-2.42-2.55-1.05-1.29-1.91-2.79-2.58-4.5-.72-1.85-1.08-3.64-1.08-5.38 0-1.99.43-3.7 1.29-5.13.68-1.15 1.58-2.05 2.71-2.72a7.14 7.14 0 013.66-1.1c.79 0 1.83.25 3.12.75 1.28.5 2.11.75 2.48.75.28 0 1.2-.29 2.74-.87 1.46-.54 2.69-.76 3.71-.68 2.74.22 4.8 1.3 6.17 3.27-2.45 1.49-3.67 3.57-3.65 6.24.02 2.08.75 3.81 2.18 5.19.65.62 1.37 1.1 2.17 1.44-.17.5-.36 1.01-.57 1.5v.03z" />
    </svg>
);

export const ChevronDownIcon = ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);
