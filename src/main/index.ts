// src/main/index.ts
import { app } from 'electron';
import { registerIpcHandlers } from './ipc';
import { createMainWindow, setWindowMode, resizePlayer, movePlayer, setMuted, getWin } from './window';
import { getConfig } from './store';

app.whenReady().then(() => {
  const cfg = getConfig();
  createMainWindow(cfg.windowState);

  registerIpcHandlers({
    onSetWindowMode: (mode) => setWindowMode(mode, getConfig()),
    onUpdateGeometry: (p) => {
      if (p.playerSize) resizePlayer(p.playerSize.w, p.playerSize.h);
      const pos = p.petPos ?? p.playerPos;
      if (pos) movePlayer(pos.x, pos.y);
    },
    onSetMuted: (muted) => setMuted(muted),
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// macOS：dock 图标点击重新打开窗口
app.on('activate', () => {
  if (!getWin()) {
    createMainWindow(getConfig().windowState);
  }
});
