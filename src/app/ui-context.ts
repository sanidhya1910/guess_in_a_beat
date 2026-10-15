import { createContext, useContext, useEffect } from 'react';

export type DialogName = 'help' | 'stats' | 'settings';

export interface UiContextValue {
    dialog: DialogName | null;
    openDialog(name: DialogName): void;
    closeDialog(): void;
    toast(message: string): void;
    /** Hides the site chrome while a game is in progress. */
    setFocusMode(on: boolean): void;
}

export const UiContext = createContext<UiContextValue | null>(null);

export function useUi(): UiContextValue {
    const ctx = useContext(UiContext);
    if (!ctx) throw new Error('useUi must be used inside <App>');
    return ctx;
}

export function useFocusMode(on: boolean) {
    const { setFocusMode } = useUi();
    useEffect(() => {
        setFocusMode(on);
        return () => setFocusMode(false);
    }, [on, setFocusMode]);
}
