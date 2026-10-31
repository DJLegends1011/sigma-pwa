import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SW_BODY = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* network only: the app is live, never serve stale */ });
`;

function findAppRoot() {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 8; i++) {
        if (fs.existsSync(path.join(dir, 'app', 'img', 'vector.svg'))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return path.resolve();
}

const appRoot = findAppRoot();
const svgPath = path.join(appRoot, 'app', 'img', 'vector.svg');
const sharp = createRequire(path.join(appRoot, 'package.json'))('sharp');
const iconCache = new Map();

export function register(router, ctx) {
    router.get('/manifest.webmanifest', (req, res) => {
        const rawStart = String(ctx.setting(req.db, 'startPath') || '');
        res.type('application/manifest+json').json({
            name: 'Project Σ',
            short_name: 'Σ',
            id: '/',
            start_url: rawStart.startsWith('/') ? rawStart : '/library.html',
            scope: '/',
            display: 'standalone',
            background_color: String(ctx.setting(req.db, 'backgroundColor') || '#0b1220'),
            theme_color: String(ctx.setting(req.db, 'themeColor') || '#0b1220'),
            icons: [
                { src: '/img/vector.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
                { src: '/api/ext/sigma-pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
                { src: '/api/ext/sigma-pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
            ],
        });
    });

    router.get('/sw.js', (_req, res) => {
        res.set('Service-Worker-Allowed', '/')
            .set('Cache-Control', 'no-cache')
            .type('application/javascript')
            .send(SW_BODY);
    });

    for (const size of [192, 512]) {
        router.get(`/icon-${size}.png`, async (_req, res) => {
            try {
                if (!iconCache.has(size)) {
                    iconCache.set(size, await sharp(svgPath).resize(size, size).png().toBuffer());
                }
                res.set('Cache-Control', 'public, max-age=86400').type('image/png').send(iconCache.get(size));
            } catch {
                res.status(404).end();
            }
        });
    }
}
