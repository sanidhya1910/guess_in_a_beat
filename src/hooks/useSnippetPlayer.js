import { useState, useRef, useEffect, useCallback } from 'react';
import { findPreviewUrl } from '../services/music';

// Plays increasingly-long audio snippets for a track and tracks play
// progress. Shared by solo play (Game.jsx) and multiplayer (MultiplayerGame.jsx)
// — both need identical "play N seconds of this track's preview" behavior,
// they just differ in what drives round/score state around it.
export const useSnippetPlayer = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isContinuousPlay, setIsContinuousPlay] = useState(false);
    const [playProgress, setPlayProgress] = useState(0);
    const [error, setError] = useState('');

    const timeoutRef = useRef(null);
    const progressRef = useRef(null);
    const audioRef = useRef(null);
    const previewCacheRef = useRef({});

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (progressRef.current) cancelAnimationFrame(progressRef.current);
            if (audioRef.current) audioRef.current.pause();
        };
    }, []);

    const resolvePreview = useCallback(async (track) => {
        if (track.preview_url) return track.preview_url;
        if (track.id in previewCacheRef.current) return previewCacheRef.current[track.id];
        const artist = track.artists.map((a) => a.name).join(' ');
        const url = await findPreviewUrl(track.name, artist);
        previewCacheRef.current[track.id] = url;
        return url;
    }, []);

    const stop = useCallback(() => {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (progressRef.current) cancelAnimationFrame(progressRef.current);
        setIsPlaying(false);
        setIsContinuousPlay(false);
        setPlayProgress(0);
    }, []);

    const playSnippet = useCallback(async (track, durationSeconds) => {
        if (isPlaying || !track) return;
        setIsPlaying(true);
        setError('');
        setPlayProgress(0);
        if (audioRef.current) audioRef.current.pause();

        const durationMs = durationSeconds * 1000;
        const url = await resolvePreview(track);
        if (!url) {
            setError('No preview available for this track.');
            setIsPlaying(false);
            return;
        }

        const startTime = Date.now();
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.currentTime = 0;
        audio.play().catch((e) => {
            // The very short snippets (0.1s, 0.5s) pause the clip almost
            // immediately, so play()'s promise is often interrupted by our own
            // pause() — that AbortError is expected and harmless, not a failure.
            // Also ignore errors from a clip we've already replaced with a newer one.
            if (e?.name === 'AbortError' || audioRef.current !== audio) return;
            console.error('Audio play error:', e);
            setError('Failed to play audio.');
            setIsPlaying(false);
            if (progressRef.current) cancelAnimationFrame(progressRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        });

        const animateProgress = () => {
            const progress = Math.min((Date.now() - startTime) / durationMs, 1);
            setPlayProgress(progress);
            if (progress < 1) progressRef.current = requestAnimationFrame(animateProgress);
        };
        progressRef.current = requestAnimationFrame(animateProgress);

        timeoutRef.current = setTimeout(() => {
            if (audioRef.current) audioRef.current.pause();
            setIsPlaying(false);
            if (progressRef.current) cancelAnimationFrame(progressRef.current);
        }, durationMs);
    }, [isPlaying, resolvePreview]);

    const playContinuously = useCallback(async (track) => {
        setIsContinuousPlay(true);
        setIsPlaying(true);
        if (audioRef.current) audioRef.current.pause();

        const url = await resolvePreview(track);
        if (url) {
            audioRef.current = new Audio(url);
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch((e) => console.error('Continuous play error:', e));
            audioRef.current.onended = () => {
                setIsPlaying(false);
                setIsContinuousPlay(false);
            };
        } else {
            setIsPlaying(false);
            setIsContinuousPlay(false);
        }
    }, [resolvePreview]);

    return { isPlaying, isContinuousPlay, playProgress, error, playSnippet, playContinuously, stop };
};
