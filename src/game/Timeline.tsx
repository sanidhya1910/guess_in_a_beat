import { useRef } from 'react';
import { audio } from '../lib/audio';
import { formatSeconds, timelinePosition } from '../lib/scoring';
import { useFrame } from './useFrame';

interface TimelineProps {
    ladder: number[];
    /** Index of the snippet currently unlocked. */
    step: number;
    playing: boolean;
}

// The full snippet ladder on one bar (square-root scale), with the unlocked
// part highlighted and a fill that follows playback.
export function Timeline({ ladder, step, playing }: TimelineProps) {
    const fill = useRef<HTMLDivElement>(null);
    const max = ladder[ladder.length - 1];
    const unlocked = ladder[Math.min(step, ladder.length - 1)];

    useFrame(playing, () => {
        const elapsed = playing ? (audio.elapsed() ?? 0) : 0;
        if (fill.current) fill.current.style.transform = `scaleX(${timelinePosition(elapsed, max)})`;
    });

    return (
        <div className="timeline" aria-hidden="true">
            <div className="timeline-track">
                <div className="timeline-unlocked" style={{ width: `${timelinePosition(unlocked, max) * 100}%` }} />
                <div ref={fill} className="timeline-fill" />
                {ladder.slice(0, -1).map((s, i) => (
                    <span
                        key={i}
                        className={`timeline-tick${i < step ? ' is-passed' : ''}`}
                        style={{ left: `${timelinePosition(s, max) * 100}%` }}
                    />
                ))}
            </div>
            <div className="timeline-labels mono">
                <span>0s</span>
                <span className="timeline-now">{formatSeconds(unlocked)} unlocked</span>
                <span>{formatSeconds(max)}</span>
            </div>
        </div>
    );
}
