// Renders the PNG brand assets in public/ (app icons and the social share
// image) by screenshotting small HTML pages with headless Chrome or Edge.
//
//   node scripts/render-brand.ts
//
// Set CHROME_PATH if the browser isn't in a default location.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

const CANDIDATES = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
].filter((p): p is string => !!p);

const browser = CANDIDATES.find((p) => existsSync(p));
if (!browser) throw new Error('No Chrome or Edge found. Set CHROME_PATH.');

const font = (pkg: string, file: string) =>
    pathToFileURL(path.join(ROOT, 'node_modules/@fontsource-variable', pkg, 'files', file)).href;

const FONTS = `
@font-face { font-family: 'Display'; src: url('${font('bricolage-grotesque', 'bricolage-grotesque-latin-standard-normal.woff2')}') format('woff2'); font-weight: 200 800; }
@font-face { font-family: 'Body'; src: url('${font('geist', 'geist-latin-wght-normal.woff2')}') format('woff2'); font-weight: 100 900; }
`;

const MARK = (size: number) => `
<svg width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="9" fill="#ee4b81"/>
  <g fill="#1d0812">
    <rect x="7" y="13" width="3" height="6" rx="1.5"/><rect x="12" y="8" width="3" height="16" rx="1.5"/>
    <rect x="17" y="11" width="3" height="10" rx="1.5"/><rect x="22" y="14.5" width="3" height="3" rx="1.5"/>
  </g>
</svg>`;

// Full-bleed square icon; platforms round the corners themselves.
const iconPage = (size: number) => `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:#ee4b81;display:grid;place-items:center">
<svg width="${size * 0.62}" height="${size * 0.62}" viewBox="6 6 20 20"><g fill="#1d0812">
<rect x="7" y="13" width="3" height="6" rx="1.5"/><rect x="12" y="8" width="3" height="16" rx="1.5"/>
<rect x="17" y="11" width="3" height="10" rx="1.5"/><rect x="22" y="14.5" width="3" height="3" rx="1.5"/></g></svg>
</body></html>`;

async function ogPage(): Promise<string> {
    const catalog = JSON.parse(await readFile(path.join(ROOT, 'src/data/catalog.json'), 'utf8')) as { category: string; covers: string[] }[];
    const urls = [...new Set(catalog.filter((p) => p.category !== 'charts').flatMap((p) => p.covers))]
        .slice(0, 16)
        .map((u) => u.replace(/\/\d+x\d+bb\./, '/300x300bb.'));
    // Inline the covers so the screenshot never races the network.
    const covers = await Promise.all(
        urls.map(async (u) => {
            const res = await fetch(u);
            const type = res.headers.get('content-type') ?? 'image/jpeg';
            return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
        }),
    );
    const cols = [0, 1, 2, 3].map((c) => covers.filter((_, i) => i % 4 === c));
    return `<!doctype html><html><head><style>${FONTS}
body{margin:0;width:1200px;height:630px;background:#0d0d11;color:#f3f2ef;font-family:Body;overflow:hidden;position:relative}
.copy{position:absolute;left:72px;top:0;bottom:0;width:560px;display:flex;flex-direction:column;justify-content:center;gap:28px}
.brand{display:flex;align-items:center;gap:14px;font-family:Display;font-weight:700;font-size:30px;letter-spacing:-0.02em}
h1{margin:0;font-family:Display;font-weight:750;font-size:84px;line-height:0.98;letter-spacing:-0.045em}
p{margin:0;font-size:26px;color:#b6b5bf}
.wall{position:absolute;right:-60px;top:-120px;display:flex;gap:16px;transform:rotate(-8deg)}
.col{display:flex;flex-direction:column;gap:16px}.col:nth-child(even){margin-top:-90px}
.col img{width:170px;height:170px;border-radius:14px;object-fit:cover}
.fade{position:absolute;inset:0;background:linear-gradient(90deg,#0d0d11 46%,rgba(13,13,17,.55) 62%,rgba(13,13,17,0) 80%)}
</style></head><body>
<div class="wall">${cols.map((c) => `<div class="col">${[...c, ...c].map((u) => `<img src="${u}">`).join('')}</div>`).join('')}</div>
<div class="fade"></div>
<div class="copy"><div class="brand">${MARK(52)}Guess in a Beat</div><h1>How fast can you name a song?</h1><p>A free music quiz. New song every day.</p></div>
</body></html>`;
}

async function shoot(html: string, out: string, width: number, height: number) {
    const dir = await mkdtemp(path.join(tmpdir(), 'gib-brand-'));
    const file = path.join(dir, 'page.html');
    await writeFile(file, html);
    execFileSync(browser!, [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--allow-file-access-from-files',
        `--window-size=${width},${height}`,
        '--virtual-time-budget=8000',
        `--screenshot=${out}`,
        pathToFileURL(file).href,
    ]);
    console.log(`wrote ${path.relative(ROOT, out)}`);
}

await shoot(iconPage(512), path.join(PUBLIC, 'icon-512.png'), 512, 512);
await shoot(iconPage(192), path.join(PUBLIC, 'icon-192.png'), 192, 192);
await shoot(iconPage(180), path.join(PUBLIC, 'apple-touch-icon.png'), 180, 180);
await shoot(await ogPage(), path.join(PUBLIC, 'og-image.png'), 1200, 630);
