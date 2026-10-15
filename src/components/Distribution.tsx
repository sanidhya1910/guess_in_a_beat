// Guess distribution for the Daily: wins on attempt 1..6, then misses.
export function Distribution({ counts, highlight }: { counts: number[]; highlight?: number }) {
    const max = Math.max(1, ...counts);
    return (
        <ol className="dist" aria-label="Guess distribution">
            {counts.map((n, i) => (
                <li key={i} className={i === highlight ? 'is-current' : undefined}>
                    <span className="dist-label mono">{i < 6 ? i + 1 : 'X'}</span>
                    <span className="dist-bar" style={{ width: `${Math.max(8, (n / max) * 100)}%` }}>
                        <span className="mono">{n}</span>
                    </span>
                </li>
            ))}
        </ol>
    );
}
