import artistsData from '../data/artists.json';
import catalogData from '../data/catalog.json';
import type { ArtistPick, DailyData, PackCategory, PackInfo, Song } from './types';

// Pack song lists are split into their own chunks and loaded on demand.
const packLoaders = import.meta.glob<Song[]>('../data/packs/*.json', { import: 'default' });

export const PACKS = catalogData as PackInfo[];
export const POPULAR_ARTISTS = artistsData as ArtistPick[];

export const CATEGORY_LABELS: Record<PackCategory, string> = {
    charts: 'Charts',
    decades: 'Decades',
    genres: 'Genres',
};

export function getPack(id: string): PackInfo | undefined {
    return PACKS.find((p) => p.id === id);
}

export async function loadPackSongs(id: string): Promise<Song[]> {
    const loader = packLoaders[`../data/packs/${id}.json`];
    if (!loader) throw new Error(`Unknown pack "${id}"`);
    return loader();
}

export async function loadDaily(): Promise<DailyData> {
    const mod = await import('../data/daily.json');
    return mod.default as DailyData;
}

export function randomPack(): PackInfo {
    const pool = PACKS.filter((p) => p.category !== 'charts' || p.country === 'us');
    return pool[Math.floor(Math.random() * pool.length)];
}
