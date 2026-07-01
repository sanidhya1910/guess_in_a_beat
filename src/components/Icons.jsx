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

export const ChevronDownIcon = ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);
