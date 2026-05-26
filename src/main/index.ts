// src/main/index.ts
import { app } from 'electron';
import { registerIpcHandlers } from './ipc';
import { createMainWindow, setWindowMode, resizePlayer, resizePet, movePlayer, setMuted, getWin, getCurrentBounds } from './window';
import { getConfig, setConfig } from './store';

app.whenReady().then(() => {
  let cfg = getConfig();
  // 老 config 里 petSize 可能 <80（之前的最小值是 48），现在拉到 80 避开 macOS
  // 小窗口默认白底 bug
  if (cfg.windowState.petSize < 80) {
    cfg = setConfig(c => ({ ...c, windowState: { ...c.windowState, petSize: 80 } }));
  }
  createMainWindow(cfg.windowState);

  registerIpcHandlers({
    onSetWindowMode: (mode) => setWindowMode(mode, getConfig()),
    onUpdateGeometry: (p) => {
      if (p.playerSize) resizePlayer(p.playerSize.w, p.playerSize.h);
      if (p.petSize) resizePet(p.petSize);
      const pos = p.petPos ?? p.playerPos;
      if (pos) movePlayer(pos.x, pos.y);
    },
    onSetMuted: (muted) => setMuted(muted),
    getBounds: () => getCurrentBounds(),
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
