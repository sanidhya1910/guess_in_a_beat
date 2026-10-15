import { XIcon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
    open: boolean;
    title: string;
    onClose(): void;
    children: ReactNode;
}

// Native <dialog>: focus trapping, Escape to close and an inert page come
// for free. Clicking the backdrop closes it too.
export function Dialog({ open, title, onClose, children }: DialogProps) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (open && !el.open) {
            el.showModal();
            // Start focus on the dialog itself rather than ringing the close button.
            el.querySelector<HTMLElement>('.dialog-inner')?.focus();
        }
        if (!open && el.open) el.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            className="dialog"
            aria-labelledby={titleId}
            onClose={onClose}
            onClick={(e) => {
                if (e.target === ref.current) onClose();
            }}
        >
            <div className="dialog-inner" tabIndex={-1}>
                <header className="dialog-head">
                    <h2 id={titleId}>{title}</h2>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
                        <XIcon size={20} weight="bold" />
                    </button>
                </header>
                <div className="dialog-body">{children}</div>
            </div>
        </dialog>
    );
}
