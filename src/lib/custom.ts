export const MAX_CUSTOM_SONGS = 25;
export const MIN_CUSTOM_SONGS = 3;

/** App path for a custom challenge made of specific iTunes track ids. */
export function customPath(title: string, country: string, ids: number[]): string {
    const q = new URLSearchParams({ t: title.trim() || 'Custom challenge', cc: country });
    // Ids stay unencoded so the link reads cleanly: ids=123,456,789
    return `/c?${q}&ids=${ids.join(',')}`;
}
