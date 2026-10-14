import { artworkAt } from '../lib/itunes';

// 2x2 collage of album covers (or a single cover when there is only one).
export function CoverGrid({ covers, size = 200, className = '' }: { covers: string[]; size?: number; className?: string }) {
    const list = covers.length >= 4 ? covers.slice(0, 4) : covers.slice(0, 1);
    if (!list.length) return <div className={`cover-grid cover-grid--empty ${className}`} aria-hidden="true" />;
    const px = list.length === 1 ? size : Math.ceil(size / 2);
    return (
        <div className={`cover-grid${list.length === 1 ? ' cover-grid--single' : ''} ${className}`} aria-hidden="true">
            {list.map((url, i) => (
                <img key={i} src={artworkAt(url, Math.min(600, px * 2))} alt="" loading="lazy" decoding="async" />
            ))}
        </div>
    );
}
