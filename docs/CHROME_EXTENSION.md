# Chrome Extension Companion Guide

The **AI Proxy Companion** is an optional browser extension that securely reads the user's currently configured Chrome proxy settings and synchronizes them with the platform inventory.

---

## 1. Privacy & Consent Architecture

The extension is designed with a strict zero-surveillance architecture:
- **No Browsing History**: The extension does **NOT** request the `history`, `tabs`, `webRequest`, or `cookies` permissions.
- **No Silent Changes**: The extension will never modify or tamper with your browser or operating system proxy settings without explicit user interaction.
- **Explicit Consent**: The user must explicitly open the popup and click **"Sync Proxy to Platform"** to transmit the current proxy configuration.
- **Pairing Authentication**: Every sync request is authenticated with a secret pairing token configured on the server.

---

## 2. Chrome Extension Permissions

Declared in `extension/manifest.json`:
- `proxy`: Used strictly to invoke `chrome.proxy.settings.get({ incognito: false })` to detect the currently active proxy protocol and address.
- `storage`: Stores your Platform API URL and Pairing Secret locally in the browser.
- `host_permissions`: Allows communication with your platform API endpoint (`http://localhost:3000/*` or your production domain).

---

## 3. Step-by-Step Installation Instructions

### Step 1: Open Chrome Extensions
In Google Chrome, navigate to:
```text
chrome://extensions/
```

### Step 2: Enable Developer Mode
Turn on the **Developer mode** toggle switch in the top-right corner of the page.

### Step 3: Load Unpacked Extension
1. Click the **"Load unpacked"** button in the top-left toolbar.
2. Select the `extension/` directory located inside this project folder:
   ```text
   c:\Users\Admin\Desktop\proxy\extension
   ```
3. The extension **"AI Proxy Intelligence - Browser Companion"** will appear in your installed extensions list.

### Step 4: Configure & Pair
1. Click the puzzle icon in the Chrome toolbar and pin **AI Proxy Companion**.
2. Click the extension icon to open the popup.
3. Verify your **Platform API URL**:
   - For local development: `http://localhost:3000`
   - For production: `https://your-domain.vercel.app`
4. Enter your **Pairing Secret Token** (default development token: `dev-chrome-extension-pairing-token-321` or the token shown in the platform's Chrome Extension tab).
5. The extension will automatically detect your active proxy (e.g. `FIXED_SERVERS`, `DIRECT`, or `PAC_SCRIPT`).
6. Click **"Sync Proxy to Platform"**.
7. Your proxy will be ingested into the platform inventory and immediately verified with a live diagnostic probe.

---

## 4. Disconnecting the Extension

You can disconnect the extension at any time by:
1. Clearing the pairing token in the extension popup.
2. Navigating to `chrome://extensions/` and clicking **"Remove"**.
3. Deleting the browser connection session from the platform's **Chrome Extension** dashboard tab.
