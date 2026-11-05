const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');

// Determine environment
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

async function startServer(port) {
  const next = require('next');
  const projectDir = path.join(__dirname, '..');
  
  const fs = require('fs');
  const distDir = (!isDev && fs.existsSync(path.join(projectDir, '.next-desktop')))
    ? '.next-desktop'
    : '.next';

  const nextApp = next({
    dev: isDev,
    dir: projectDir,
    conf: {
      distDir: distDir
    }
  });

  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`[WebsiteSpark Desktop] Server listening on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#020617',
    title: 'WebsiteSpark AI Proxy Intelligence Platform',
    icon: path.join(__dirname, '../public/favicon.ico'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // Sleek application menu
  Menu.setApplicationMenu(null);

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!url.includes(`127.0.0.1:${port}`) && !url.includes(`localhost:${port}`)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

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
      'Unable to launch WebsiteSpark AI Proxy Intelligence Platform:\n' + err.message
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverInstance) {
    serverInstance.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (mainWindow === null) {
    const port = await getFreePort();
    serverInstance = await startServer(port);
    createMainWindow(port);
  }
});
