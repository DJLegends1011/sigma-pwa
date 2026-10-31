const MANIFEST_HREF = '/api/ext/sigma-pwa/manifest.webmanifest';
const SW_URL = '/api/ext/sigma-pwa/sw.js';

let linkEl = null;
let metaEl = null;
let removePromptListener = null;

function toHex(str) {
    const s = String(str || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
    const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s);
    if (!m) return null;
    const h = (n) => Math.min(255, Math.max(0, Number(n))).toString(16).padStart(2, '0');
    return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
}

function readLiveBgColor() {
    if (typeof getComputedStyle !== 'function' || !document.documentElement) return null;
    const style = getComputedStyle(document.documentElement);
    for (const prop of ['--bg-primary', '--sx-ink', '--mn-ink']) {
        const hex = toHex(style.getPropertyValue(prop));
        if (hex) return hex;
    }
    return document.body ? toHex(getComputedStyle(document.body).backgroundColor) : null;
}

export default {
    init(ctx) {
        const esc = (s) => ctx.CoreAPI.escapeHtml(String(s ?? ''));
        const head = document.head || document.documentElement || document.body;

        if (head && !head.querySelector(`link[rel="manifest"][href="${MANIFEST_HREF}"]`)) {
            linkEl = document.createElement('link');
            linkEl.setAttribute('rel', 'manifest');
            linkEl.setAttribute('href', MANIFEST_HREF);
            head.appendChild(linkEl);
        }

        if (head && !head.querySelector('meta[name="theme-color"]')) {
            metaEl = document.createElement('meta');
            metaEl.setAttribute('name', 'theme-color');
            metaEl.setAttribute('content', String(ctx.settings.get('themeColor') || '#0b1220'));
            head.appendChild(metaEl);
        }

        const syncColors = () => {
            if (ctx.settings.get('autoTheme') !== false) {
                const live = readLiveBgColor();
                if (live) {
                    if (ctx.settings.get('themeColor') !== live) ctx.settings.set('themeColor', live);
                    if (ctx.settings.get('backgroundColor') !== live) ctx.settings.set('backgroundColor', live);
                    if (metaEl) metaEl.setAttribute('content', live);
                    return;
                }
            }
            if (metaEl) metaEl.setAttribute('content', String(ctx.settings.get('themeColor') || '#0b1220'));
        };

        syncColors();
        ctx.events.on('settings.changed', () => setTimeout(syncColors, 50));
        ctx.events.on('extensions.ready', syncColors);

        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker) {
            navigator.serviceWorker.register(SW_URL, { scope: '/' }).catch((err) => {
                ctx.log('service worker registration failed:', err?.message || err);
            });
        }

        let deferredPrompt = null;
        const onPrompt = (e) => { e.preventDefault(); deferredPrompt = e; };
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('beforeinstallprompt', onPrompt);
            removePromptListener = () => window.removeEventListener('beforeinstallprompt', onPrompt);
        }

        ctx.ui.addAction('app', {
            id: 'install',
            label: 'Install as app',
            icon: 'fa-download',
            when: () => !!deferredPrompt,
            run: () => deferredPrompt?.prompt(),
        });

        ctx.ui.addSettingsSection((el) => {
            const draw = () => {
                const auto = ctx.settings.get('autoTheme') !== false;
                const tc = esc(ctx.settings.get('themeColor') || '#0b1220');
                const bg = esc(ctx.settings.get('backgroundColor') || '#0b1220');
                const sp = esc(ctx.settings.get('startPath') || '/library.html');

                el.innerHTML = `
                    <div class="settings-row">
                        <label><input type="checkbox" class="cl-switch-input" data-spwa-auto${auto ? ' checked' : ''}><span class="cl-switch" aria-hidden="true"></span> Match active theme colors automatically</label>
                        <span class="settings-hint">Syncs the status bar and launch background to your active Project Σ theme.</span>
                    </div>
                    <div class="settings-row"${auto ? ' hidden' : ''}>
                        <label for="spwa-theme">Theme color</label>
                        <div class="settings-input-group color-input-group">
                            <input id="spwa-theme" type="color" data-spwa-set="themeColor" value="${tc}">
                            <span class="color-preview-label">${tc}</span>
                        </div>
                    </div>
                    <div class="settings-row"${auto ? ' hidden' : ''}>
                        <label for="spwa-bg">Background color</label>
                        <div class="settings-input-group color-input-group">
                            <input id="spwa-bg" type="color" data-spwa-set="backgroundColor" value="${bg}">
                            <span class="color-preview-label">${bg}</span>
                        </div>
                    </div>
                    <div class="settings-row">
                        <label for="spwa-start">Start path</label>
                        <input id="spwa-start" type="search" autocomplete="off" spellcheck="false" class="glass-input" data-spwa-set="startPath" value="${sp}" placeholder="/library.html">
                    </div>
                    <p class="settings-hint">After changing these, reinstall the app for Chrome to pick them up.</p>`;

                el.querySelector('[data-spwa-auto]')?.addEventListener('change', (e) => {
                    ctx.settings.set('autoTheme', e.target.checked);
                    syncColors();
                    draw();
                });

                for (const input of el.querySelectorAll('[data-spwa-set]')) {
                    input.addEventListener('change', () => {
                        const key = input.dataset.spwaSet;
                        let val = input.value.trim();
                        if (key === 'startPath' && !val.startsWith('/')) val = input.value = '/library.html';
                        ctx.settings.set(key, val);
                        const label = input.parentElement?.querySelector('.color-preview-label');
                        if (label) label.textContent = val;
                        syncColors();
                    });
                }
            };
            draw();
        });
    },

    dispose() {
        removePromptListener?.();
        removePromptListener = null;
        linkEl?.remove();
        linkEl = null;
        metaEl?.remove();
        metaEl = null;
    },
};
