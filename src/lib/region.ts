// iTunes storefronts. Search results (and which songs exist) differ per store,
// so guesses are searched in the player's own region.

export const REGIONS: { code: string; name: string }[] = [
    { code: 'us', name: 'United States' },
    { code: 'gb', name: 'United Kingdom' },
    { code: 'in', name: 'India' },
    { code: 'ca', name: 'Canada' },
    { code: 'au', name: 'Australia' },
    { code: 'nz', name: 'New Zealand' },
    { code: 'ie', name: 'Ireland' },
    { code: 'de', name: 'Germany' },
    { code: 'fr', name: 'France' },
    { code: 'es', name: 'Spain' },
    { code: 'it', name: 'Italy' },
    { code: 'nl', name: 'Netherlands' },
    { code: 'se', name: 'Sweden' },
    { code: 'pl', name: 'Poland' },
    { code: 'tr', name: 'Türkiye' },
    { code: 'br', name: 'Brazil' },
    { code: 'mx', name: 'Mexico' },
    { code: 'ar', name: 'Argentina' },
    { code: 'co', name: 'Colombia' },
    { code: 'jp', name: 'Japan' },
    { code: 'kr', name: 'South Korea' },
    { code: 'ph', name: 'Philippines' },
    { code: 'id', name: 'Indonesia' },
    { code: 'sg', name: 'Singapore' },
    { code: 'my', name: 'Malaysia' },
    { code: 'pk', name: 'Pakistan' },
    { code: 'bd', name: 'Bangladesh' },
    { code: 'lk', name: 'Sri Lanka' },
    { code: 'np', name: 'Nepal' },
    { code: 'ae', name: 'United Arab Emirates' },
    { code: 'sa', name: 'Saudi Arabia' },
    { code: 'za', name: 'South Africa' },
    { code: 'ng', name: 'Nigeria' },
];

const KNOWN = new Set(REGIONS.map((r) => r.code));

const TIMEZONES: Record<string, string> = {
    'Asia/Kolkata': 'in',
    'Asia/Calcutta': 'in',
    'Europe/London': 'gb',
    'Europe/Dublin': 'ie',
    'Europe/Berlin': 'de',
    'Europe/Paris': 'fr',
    'Europe/Madrid': 'es',
    'Europe/Rome': 'it',
    'Europe/Amsterdam': 'nl',
    'Europe/Stockholm': 'se',
    'Europe/Warsaw': 'pl',
    'Europe/Istanbul': 'tr',
    'America/Sao_Paulo': 'br',
    'America/Mexico_City': 'mx',
    'America/Argentina/Buenos_Aires': 'ar',
    'America/Bogota': 'co',
    'America/Toronto': 'ca',
    'America/Vancouver': 'ca',
    'Asia/Tokyo': 'jp',
    'Asia/Seoul': 'kr',
    'Asia/Manila': 'ph',
    'Asia/Jakarta': 'id',
    'Asia/Singapore': 'sg',
    'Asia/Kuala_Lumpur': 'my',
    'Asia/Karachi': 'pk',
    'Asia/Dhaka': 'bd',
    'Asia/Colombo': 'lk',
    'Asia/Kathmandu': 'np',
    'Asia/Dubai': 'ae',
    'Asia/Riyadh': 'sa',
    'Africa/Johannesburg': 'za',
    'Africa/Lagos': 'ng',
    'Pacific/Auckland': 'nz',
};

export function detectRegion(): string {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (TIMEZONES[tz]) return TIMEZONES[tz];
        if (tz.startsWith('Australia/')) return 'au';
        for (const lang of navigator.languages ?? []) {
            const region = lang.split('-')[1]?.toLowerCase();
            if (region && KNOWN.has(region)) return region;
        }
        if (tz.startsWith('America/')) return 'us';
    } catch {
        // Intl or navigator unavailable.
    }
    return 'us';
}

export function regionName(code: string): string {
    return REGIONS.find((r) => r.code === code)?.name ?? code.toUpperCase();
}
