# Installable app (PWA) (`sigma-pwa`)

Makes Project Σ installable as a standalone Progressive Web App (PWA) on Android and desktop Chrome, removing the top browser title/URL bar.

## What it does

- **Web App Manifest** (`/api/ext/sigma-pwa/manifest.webmanifest`): Serves an account-scoped `application/manifest+json` with `display: "standalone"`, `scope: "/"`, configurable `start_url`, `theme_color`, and `background_color`, plus the vector SVG icon and 192×192 / 512×512 PNG icons rendered on demand from `app/img/vector.svg`.
- **Service Worker** (`/api/ext/sigma-pwa/sw.js`): Serves a network-only service worker with `Service-Worker-Allowed: /` and registers it at scope `/` so Chrome's standalone installability check passes without caching stale responses over Project Σ's live change feed.
- **Client Integration**: Injects `<link rel="manifest">` and `<meta name="theme-color">` into `<head>`, captures `beforeinstallprompt` to expose an **Install as app** action in the topbar `⋮` / More menu when available, and adds a settings section under **Settings > Extensions**.

## Installing & Enabling

1. Copy the `sigma-pwa` folder to `extensions/installed/sigma-pwa/` (or install it from a `.zip`).
2. Press **Refresh** in **Settings > Extensions**, restart the Project Σ server so the server routes mount, and toggle **Installable app (PWA)** on.
3. Reload the page, then use Chrome's **Install app** menu item (or **Install as app** in Project Σ's menu).

## Plain HTTP & Android Chrome (`chrome://flags`)

Browsers treat `http://localhost` as a secure context on the device running the server, but if you connect to Project Σ over plain HTTP from Android Chrome (either via a LAN IP like `http://192.168.x.x:7788` or a local port forward where Chrome does not treat the origin as secure):

1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure` in Chrome on Android.
2. Add your Project Σ origin (for example `http://localhost:7788` or `http://192.168.1.20:7788`).
3. Enable the flag and relaunch Chrome.

Chrome will then register the service worker and offer **Install app** instead of a basic shortcut.

## Changing Settings

You can customize **Theme color**, **Background color**, and **Start path** in **Settings > Extensions > Installable app (PWA)**.

> **Note:** Chrome reads the web app manifest when the app is installed. After changing these settings, uninstall and reinstall the app for Chrome to pick them up.
