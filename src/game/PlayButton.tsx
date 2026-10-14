import { ArrowsClockwiseIcon, PlayIcon, StopIcon } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import { audio } from '../lib/audio';
import { useFrame } from './useFrame';

interface PlayButtonProps {
    state: 'loading' | 'ready' | 'playing' | 'error';
    onPress(): void;
    label: string;
}

const BARS = 48;
const SIZE = 220;

// Big play button wrapped in a radial visualizer driven by the audio analyser.
export function PlayButton({ state, onPress, label }: PlayButtonProps) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const levels = useRef(new Uint8Array(64));
    const smooth = useRef(new Float32Array(BARS));
    const color = useRef('#ee4b81');
    const reduced = useRef(false);

    useEffect(() => {
        const c = canvas.current;
        if (!c) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        c.width = SIZE * dpr;
        c.height = SIZE * dpr;
        c.getContext('2d')?.scale(dpr, dpr);
        color.current = getComputedStyle(c).getPropertyValue('--accent').trim() || color.current;
        reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }, []);

    const playing = state === 'playing';

    // Pick up the accent again in case the theme changed since the last play.
    useEffect(() => {
        if (canvas.current) color.current = getComputedStyle(canvas.current).getPropertyValue('--accent').trim() || color.current;
    }, [playing]);

    useFrame(playing, () => {
        const c = canvas.current;
        const ctx = c?.getContext('2d');
        if (!ctx) return;
        const analyser = playing ? audio.analyser : null;
        if (analyser) analyser.getByteFrequencyData(levels.current);
        const t = performance.now() / 1000;

        ctx.clearRect(0, 0, SIZE, SIZE);
        const cx = SIZE / 2;
        const inner = 62;
        for (let i = 0; i < BARS; i++) {
            // Mirror the low end of the spectrum around the circle.
            const bin = i < BARS / 2 ? i : BARS - 1 - i;
            let target = 0;
            if (playing && !reduced.current) {
                target = analyser ? levels.current[bin + 1] / 255 : 0.35 + 0.25 * Math.sin(t * 7 + i * 0.6);
            }
            const v = (smooth.current[i] += (target - smooth.current[i]) * 0.35);
            const len = 4 + v * 40;
            const angle = (i / BARS) * Math.PI * 2 - Math.PI / 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            ctx.strokeStyle = color.current;
            ctx.globalAlpha = playing ? 0.35 + v * 0.65 : 0.22;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx + cos * inner, cx + sin * inner);
            ctx.lineTo(cx + cos * (inner + len), cx + sin * (inner + len));
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    });

    return (
        <div className={`player is-${state}`}>
            <canvas ref={canvas} className="player-viz" aria-hidden="true" />
            <button
                type="button"
                className="play-btn"
                onClick={onPress}
                disabled={state === 'loading'}
                aria-label={label}
                title={label}
            >
                {state === 'loading' ? (
                    <span className="spinner spinner--lg" />
                ) : state === 'error' ? (
                    <ArrowsClockwiseIcon size={34} weight="bold" />
                ) : playing ? (
                    <StopIcon size={34} weight="fill" />
                ) : (
                    <PlayIcon size={38} weight="fill" className="play-icon" />
                )}
            </button>
        </div>
    );
}
