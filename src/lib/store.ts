import { useSyncExternalStore } from 'react';

// A tiny persisted store: state lives in memory, is mirrored to localStorage,
// and stays in sync across tabs. Storage can be unavailable (private mode,
// blocked cookies), so every access is guarded and the app keeps working
// without persistence.

export interface Store<T> {
    get(): T;
    set(update: Partial<T> | ((state: T) => T)): void;
    subscribe(listener: () => void): () => void;
}

function read<T extends object>(key: string, initial: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? { ...initial, ...(JSON.parse(raw) as Partial<T>) } : initial;
    } catch {
        return initial;
    }
}

export function createStore<T extends object>(key: string, initial: T): Store<T> {
    let state = read(key, initial);
    const listeners = new Set<() => void>();
    const emit = () => listeners.forEach((l) => l());

    if (typeof window !== 'undefined') {
        window.addEventListener('storage', (e) => {
            if (e.key !== key) return;
            state = read(key, initial);
            emit();
        });
    }

    return {
        get: () => state,
        set(update) {
            state = typeof update === 'function' ? update(state) : { ...state, ...update };
            try {
                localStorage.setItem(key, JSON.stringify(state));
            } catch {
                // Storage full or blocked: keep the in-memory state.
            }
            emit();
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

export function useStore<T>(store: Store<T>): T {
    return useSyncExternalStore(store.subscribe, store.get, store.get);
}
