const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');
const fs = require('fs');

// Production environment
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
let mainWindow = null;
let serverInstance = null;

// Find free internal port
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

// Single instance lock (prevent multiple app instances)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Setup embedded production environment defaults
function setupEnvironment(projectDir) {
  process.env.NODE_ENV = 'production';
  process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'websitespark20';
  process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'spark78601';
  process.env.DB_MODE = process.env.DB_MODE || 'supabase';
  process.env.ALLOW_INTERNAL_IPS = 'false';
  process.env.MAX_CHECK_TIMEOUT_MS = '6000';
  process.env.CHROME_SYNC_SECRET = process.env.CHROME_SYNC_SECRET || 'dev-chrome-extension-pairing-token-321';

  // Read .env.local if present
  const envPath = path.join(projectDir, '.env.local');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim();
          if (val && !process.env[key]) process.env[key] = val;
        }
      });
    } catch (e) {
      console.warn('Error reading .env.local:', e.message);
    }
  }
}

async function startServer(port) {
  const projectDir = app.getAppPath();
  setupEnvironment(projectDir);

  const next = require('next');
  
  const distDir = fs.existsSync(path.join(projectDir, '.next-desktop'))
    ? '.next-desktop'
    : '.next';

  const nextApp = next({
    dev: false,
    dir: projectDir,
    conf: {
      distDir: distDir,
      poweredByHeader: false
    }
  });

  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    server.on('error', reject);

    server.listen(port, '127.0.0.1', () => {
      console.log(`[WebsiteSpark Desktop] Server listening on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

function createMainWindow(port) {
  const iconPath = path.join(__dirname, '../public/favicon.ico');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#020617',
    title: 'WebsiteSpark AI Proxy Intelligence Platform',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // Remove native browser menu for pure desktop software feel
  Menu.setApplicationMenu(null);

  mainWindow.webContents.on('did-fail-load', (e, code, desc, url) => {
    console.error(`[Electron] Page failed to load: ${code} - ${desc} (${url})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron] Page loaded successfully inside desktop window!');
  });

  console.log(`[Electron] Loading application URL: http://127.0.0.1:${port}`);
  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // External web links open in user's browser, internal app links stay strictly inside software
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!url.includes(`127.0.0.1:${port}`) && !url.includes(`localhost:${port}`)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  mainWindow.on('close', (e) => {
    console.log('[Electron] mainWindow close event triggered');
  });

  mainWindow.on('closed', () => {
    console.log('[Electron] mainWindow closed event fired');
    mainWindow = null;
  });
}

app.on('before-quit', () => console.log('[Electron] before-quit fired'));
app.on('will-quit', () => console.log('[Electron] will-quit fired'));
app.on('quit', (e, code) => console.log('[Electron] quit fired with code:', code));

// IPC Handlers
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// App Lifecycle
app.whenReady().then(async () => {
  try {
    const port = await getFreePort();
    serverInstance = await startServer(port);
    createMainWindow(port);
  } catch (err) {
    console.error('Failed to launch application:', err);
    dialog.showErrorBox(
      'Startup Failure',
      'Unable to launch WebsiteSpark AI Proxy Intelligence Platform:\n' + (err.stack || err.message)
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverInstance) {
    try {
      serverInstance.close();
    } catch {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (mainWindow === null) {
    try {
      const port = await getFreePort();
      serverInstance = await startServer(port);
      createMainWindow(port);
    } catch (err) {
      console.error(err);
    }
  }
});
