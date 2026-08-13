import { app, BrowserWindow, session } from 'electron';
import { join } from 'node:path';
import { registerClipboardIpc } from './clipboard-ipc';

const DEFAULT_WIDTH = 520;
const DEFAULT_HEIGHT = 760;
const MIN_WIDTH = 480;
const MIN_HEIGHT = 640;

// Dev needs Vite HMR / eval. Production stays on default-src 'self'.
const DEV_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:* ws://localhost:* http://localhost:*",
].join('; ');

const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
].join('; ');

function isDev(): boolean {
  return Boolean(process.env.ELECTRON_RENDERER_URL);
}

function applyContentSecurityPolicy(): void {
  const policy = isDev() ? DEV_CSP : PROD_CSP;
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy],
      },
    });
  });
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: '客服话术工作台 · Demo',
    backgroundColor: '#f3f5f4',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  win.on('ready-to-show', () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  return win;
}

async function loadRenderer(win: BrowserWindow): Promise<void> {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    await win.loadURL(devUrl);
    return;
  }
  await win.loadFile(join(__dirname, '../renderer/index.html'));
}

app.setName('客服话术工作台 Demo');

app.whenReady().then(async () => {
  applyContentSecurityPolicy();
  registerClipboardIpc();

  const win = createWindow();
  await loadRenderer(win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const next = createWindow();
      void loadRenderer(next);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
