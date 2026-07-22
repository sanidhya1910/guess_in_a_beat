import { useState, useRef, useEffect, useCallback } from 'react';
import { findPreviewUrl } from '../services/music';

// Plays increasingly-long audio snippets for a track and tracks play
// progress. Shared by solo play (Game.jsx) and multiplayer (MultiplayerGame.jsx)
// — both need identical "play the first N seconds of this track" behavior,
// they just differ in what drives round/score state around it.
//
// Every snippet must start from 0. A freshly-created Audio ignores
// `currentTime = 0` until its metadata has loaded, and the browser then
// resumes the cached media from wherever the previous snippet paused — so the
// 0.5s clip would play 0.1s→0.5s instead of 0→0.5s. To avoid that we reuse one
// loaded element per track and seek to 0 only once it's actually seekable.
export const useSnippetPlayer = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isContinuousPlay, setIsContinuousPlay] = useState(false);
    const [playProgress, setPlayProgress] = useState(0);
    const [error, setError] = useState('');

    const timeoutRef = useRef(null);
    const progressRef = useRef(null);
    const audioRef = useRef(null);        // currently active element
    const urlCacheRef = useRef({});       // track id -> resolved preview url
    const elementCacheRef = useRef({});   // url -> HTMLAudioElement (kept loaded so seeking to 0 is reliable)

    const clearTimers = () => {
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        if (progressRef.current) { cancelAnimationFrame(progressRef.current); progressRef.current = null; }
    };

    useEffect(() => {
        return () => {
            clearTimers();
            if (audioRef.current) audioRef.current.pause();
        };
    }, []);

    const resolvePreview = useCallback(async (track) => {
        if (track.preview_url) return track.preview_url;
        if (track.id in urlCacheRef.current) return urlCacheRef.current[track.id];
        const artist = track.artists.map((a) => a.name).join(' ');
        const url = await findPreviewUrl(track.name, artist);
        urlCacheRef.current[track.id] = url;
        return url;
    }, []);

    // Reuse one loaded element per source so repeated snippets of the same
    // track can seek to 0 reliably.
    const getElement = (url) => {
        let el = elementCacheRef.current[url];
        if (!el) {
            el = new Audio(url);
            el.preload = 'auto';
            elementCacheRef.current[url] = el;
        }
        return el;
    };

    // Seek to the beginning, then run cb. currentTime=0 only takes effect once
    // metadata is loaded, so defer until then for a not-yet-ready element.
    const fromStart = (audio, cb) => {
        const go = () => {
            try { audio.currentTime = 0; } catch { /* not seekable yet */ }
            cb();
        };
        if (audio.readyState >= 1 /* HAVE_METADATA */) go();
        else audio.addEventListener('loadedmetadata', go, { once: true });
    };

    const stop = useCallback(() => {
        clearTimers();
        Object.values(elementCacheRef.current).forEach((el) => {
            el.pause();
            el.onended = null;
        });
        elementCacheRef.current = {};
        audioRef.current = null;
        setIsPlaying(false);
        setIsContinuousPlay(false);
        setPlayProgress(0);
    }, []);

    const playSnippet = useCallback(async (track, durationSeconds) => {
        if (isPlaying || !track) return;
        setIsPlaying(true);
        setError('');
        setPlayProgress(0);
        clearTimers();
        if (audioRef.current) audioRef.current.pause();

        const durationMs = durationSeconds * 1000;
        const url = await resolvePreview(track);
        if (!url) {
            setError('No preview available for this track.');
            setIsPlaying(false);
            return;
        }

        const audio = getElement(url);
        audioRef.current = audio;
        audio.onended = null;
        audio.pause();

        fromStart(audio, () => {
            const startTime = Date.now();
            audio.play().catch((e) => {
                // The very short snippets pause almost immediately, so play()'s
                // promise is often interrupted by our own pause() — that
                // AbortError is expected. Also ignore a clip we've replaced.
                if (e?.name === 'AbortError' || audioRef.current !== audio) return;
                console.error('Audio play error:', e);
                setError('Failed to play audio.');
                setIsPlaying(false);
                clearTimers();
            });

            const animateProgress = () => {
                const progress = Math.min((Date.now() - startTime) / durationMs, 1);
                setPlayProgress(progress);
                if (progress < 1) progressRef.current = requestAnimationFrame(animateProgress);
            };
            progressRef.current = requestAnimationFrame(animateProgress);

            timeoutRef.current = setTimeout(() => {
                if (audioRef.current === audio) audio.pause();
                setIsPlaying(false);
                if (progressRef.current) cancelAnimationFrame(progressRef.current);
            }, durationMs);
        });
    }, [isPlaying, resolvePreview]);

    const playContinuously = useCallback(async (track) => {
        setIsContinuousPlay(true);
        setIsPlaying(true);
        clearTimers();
        if (audioRef.current) audioRef.current.pause();

        const url = await resolvePreview(track);
        if (!url) {
            setIsPlaying(false);
            setIsContinuousPlay(false);
            return;
        }

        const audio = getElement(url);
        audioRef.current = audio;
        fromStart(audio, () => {
            audio.play().catch((e) => {
                if (e?.name !== 'AbortError') console.error('Continuous play error:', e);
            });
            audio.onended = () => {
                setIsPlaying(false);
                setIsContinuousPlay(false);
            };
        });
    }, [resolvePreview]);

    return { isPlaying, isContinuousPlay, playProgress, error, playSnippet, playContinuously, stop };
};
