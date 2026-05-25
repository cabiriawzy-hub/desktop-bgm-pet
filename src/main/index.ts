import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { registerIpcHandlers } from './ipc';

app.whenReady().then(() => {
  registerIpcHandlers({
    onSetWindowMode: () => {},      // Task 6 填
    onUpdateGeometry: () => {},     // Task 6 填
    onSetMuted: () => {},           // Task 6 填
  });

  const win = new BrowserWindow({
    width: 360,
    height: 240,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
