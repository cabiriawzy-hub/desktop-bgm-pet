// src/main/index.ts
import { app } from 'electron';
import { registerIpcHandlers } from './ipc';
import { createMainWindow, setWindowMode, resizePlayer, movePlayer, setMuted, getWin } from './window';
import { getConfig } from './store';

// 必须在 app.whenReady() 之前。
// Site Isolation 默认开，会把 B 站 iframe 隔到独立进程，导致我们拿不到 contentDocument。
// 我们需要主帧能读跨域 iframe 的 DOM 以注入 CSS 隐藏 B 站 chrome、并控制 video 元素。
app.commandLine.appendSwitch('disable-features', 'IsolateOrigins,site-per-process,IsolateSandboxedIframes');
app.commandLine.appendSwitch('disable-site-isolation-trials');

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
