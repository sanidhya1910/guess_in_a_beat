import { useSyncExternalStore } from 'react';

// Minimal history-API router. Paths are app-relative ("/daily"); the deploy
// base path (e.g. "/guess_in_a_beat/" on GitHub Pages) is added and removed here.

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

window.addEventListener('popstate', emit);

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

const snapshot = () => window.location.pathname + window.location.search;

export function href(to: string): string {
    return BASE + to;
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
    if (opts.replace) window.history.replaceState(null, '', href(to));
    else window.history.pushState(null, '', href(to));
    window.scrollTo({ top: 0 });
    emit();
}

export interface Location {
    path: string;
    query: URLSearchParams;
}

export function useLocation(): Location {
    const current = useSyncExternalStore(subscribe, snapshot, snapshot);
    const url = new URL(current, window.location.origin);
    let path = url.pathname;
    if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length);
    return { path: path.replace(/\/+$/, '') || '/', query: url.searchParams };
}

/** Match "/play/:id" against a path; returns params or null. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
    const want = pattern.split('/').filter(Boolean);
    const got = path.split('/').filter(Boolean);
    if (want.length !== got.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < want.length; i++) {
        if (want[i].startsWith(':')) params[want[i].slice(1)] = decodeURIComponent(got[i]);
        else if (want[i] !== got[i]) return null;
    }
    return params;
}
