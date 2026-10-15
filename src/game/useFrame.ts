import { useEffect, useRef } from 'react';

/** Runs `callback` on every animation frame while `active` is true. The
 *  callback writes to the DOM directly so playback animation never re-renders
 *  React. */
export function useFrame(active: boolean, callback: () => void) {
    const ref = useRef(callback);
    useEffect(() => {
        ref.current = callback;
    });
    useEffect(() => {
        ref.current();
        if (!active) return;
        let raf = requestAnimationFrame(function tick() {
            ref.current();
            raf = requestAnimationFrame(tick);
        });
        return () => {
            cancelAnimationFrame(raf);
            ref.current();
        };
    }, [active]);
}
