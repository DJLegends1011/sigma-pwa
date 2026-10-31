const MANIFEST_HREF = '/api/ext/sigma-pwa/manifest.webmanifest';
const SW_URL = '/api/ext/sigma-pwa/sw.js';

let linkEl = null;
let metaEl = null;
let removePromptListener = null;

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
            const tc = esc(ctx.settings.get('themeColor') || '#0b1220');
            const bg = esc(ctx.settings.get('backgroundColor') || '#0b1220');
            const sp = esc(ctx.settings.get('startPath') || '/library.html');

            el.innerHTML = `
                <div class="settings-row">
                    <label for="spwa-theme">Theme color</label>
                    <input id="spwa-theme" type="color" class="glass-input" data-spwa-set="themeColor" value="${tc}">
                </div>
                <div class="settings-row">
                    <label for="spwa-bg">Background color</label>
                    <input id="spwa-bg" type="color" class="glass-input" data-spwa-set="backgroundColor" value="${bg}">
                </div>
                <div class="settings-row">
                    <label for="spwa-start">Start path</label>
                    <input id="spwa-start" type="search" autocomplete="off" spellcheck="false" class="glass-input" data-spwa-set="startPath" value="${sp}" placeholder="/library.html">
                </div>
                <p class="settings-hint">After changing these, reinstall the app for Chrome to pick them up.</p>`;

            for (const input of el.querySelectorAll('[data-spwa-set]')) {
                input.addEventListener('change', () => {
                    const key = input.dataset.spwaSet;
                    let val = input.value.trim();
                    if (key === 'startPath' && !val.startsWith('/')) val = input.value = '/library.html';
                    ctx.settings.set(key, val);
                    if (key === 'themeColor' && metaEl) metaEl.setAttribute('content', val);
                });
            }
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
