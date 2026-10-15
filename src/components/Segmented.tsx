import { useRef, type KeyboardEvent } from 'react';

interface Option<T> {
    value: T;
    label: string;
}

interface SegmentedProps<T> {
    value: T;
    options: Option<T>[];
    onChange(value: T): void;
    labelledBy?: string;
}

// Radio group styled as a segmented control, with arrow-key navigation.
export function Segmented<T extends string | number>({ value, options, onChange, labelledBy }: SegmentedProps<T>) {
    const ref = useRef<HTMLDivElement>(null);

    const onKeyDown = (e: KeyboardEvent) => {
        const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const i = options.findIndex((o) => o.value === value);
        const next = options[(i + dir + options.length) % options.length];
        onChange(next.value);
        const buttons = ref.current?.querySelectorAll<HTMLButtonElement>('button');
        buttons?.[options.indexOf(next)]?.focus();
    };

    return (
        <div ref={ref} className="segmented" role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
            {options.map((o) => (
                <button
                    key={String(o.value)}
                    type="button"
                    role="radio"
                    aria-checked={o.value === value}
                    tabIndex={o.value === value ? 0 : -1}
                    onClick={() => onChange(o.value)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
