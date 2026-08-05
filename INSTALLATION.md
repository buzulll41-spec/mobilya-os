# MOBILYA OS - Real Device Installation Guide

## Preconditions

- Use HTTPS in production (or localhost for test).
- Ensure `manifest.webmanifest` and `sw.js` are reachable.
- Open the app once online to allow service worker/cache warm-up.

---

## Android - Chrome

1. Open MOBILYA OS in Chrome.
2. Wait until the app fully loads.
3. Tap browser menu (three dots).
4. Tap `Add to Home screen` or `Install app`.
5. Confirm installation.
6. Launch from home screen icon.
7. Verify it opens without browser address bar (standalone).

## Android - Samsung Internet

1. Open MOBILYA OS in Samsung Internet.
2. Tap menu.
3. Tap `Add page to` -> `Home screen`.
4. Confirm.
5. Launch from home screen icon.
6. Verify standalone-style launch.

## Android - Microsoft Edge

1. Open MOBILYA OS in Edge.
2. Tap menu (three dots).
3. Tap `Add to phone` / `Install this site as an app`.
4. Confirm install.
5. Launch app icon and verify standalone mode.

---

## iPhone - Safari

1. Open MOBILYA OS in Safari.
2. Tap Share icon.
3. Tap `Add to Home Screen`.
4. Confirm title and tap `Add`.
5. Launch from home screen icon.
6. Verify status bar style + no Safari chrome (standalone behavior).

---

## Windows

### Edge (recommended)

1. Open MOBILYA OS in Microsoft Edge.
2. Open menu -> `Apps` -> `Install this site as an app`.
3. Confirm install.
4. Launch from Start Menu/Desktop shortcut.
5. Verify standalone window opens.

### Chrome

1. Open MOBILYA OS in Chrome.
2. Open menu -> `Cast, save and share` -> `Install page as app`.
3. Confirm install.
4. Launch from desktop/start shortcut.
5. Verify standalone app window.

---

## Desktop (General)

1. Install from Edge/Chrome using the browser install action.
2. Pin to taskbar/dock if needed.
3. Reopen from app shortcut.
4. Confirm session persistence (user remains logged in).

---

## Verification Checklist After Install

- App opens from icon/shortcut.
- App launches in standalone mode.
- Login session persists after close/reopen.
- App starts with offline shell when network is unavailable (after first online load).
- Theme color and icon are correct.
- Safe-area and bottom navigation render correctly on phone.
