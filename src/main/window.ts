// src/main/window.ts
import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import type { Config, WindowState } from '../shared/types';

let win: BrowserWindow | null = null;
let currentMode: 'folded' | 'expanded' = 'folded';

/**
 * 校验位置是否在某个显示器范围内，否则归位到主屏中心。
 */
function clampPosition(
  pos: { x: number; y: number },
  size: { w: number; h: number }
): { x: number; y: number } {
  if (pos.x < 0 || pos.y < 0) {
    const primary = screen.getPrimaryDisplay().workArea;
    return {
      x: Math.round(primary.x + (primary.width - size.w) / 2),
      y: Math.round(primary.y + (primary.height - size.h) / 2),
    };
  }
  const displays = screen.getAllDisplays();
  const inside = displays.some(d => {
    const a = d.workArea;
    return pos.x + size.w > a.x && pos.x < a.x + a.width
      && pos.y + size.h > a.y && pos.y < a.y + a.height;
  });
  if (!inside) {
    const primary = screen.getPrimaryDisplay().workArea;
    return {
      x: Math.round(primary.x + (primary.width - size.w) / 2),
      y: Math.round(primary.y + (primary.height - size.h) / 2),
    };
  }
  return pos;
}

export function createMainWindow(state: WindowState): BrowserWindow {
  currentMode = state.mode;
  const size = state.mode === 'folded'
    ? { w: state.petSize, h: state.petSize }
    : state.playerSize;
  const rawPos = state.mode === 'folded' ? state.petPos : state.playerPos;
  const pos = clampPosition(rawPos, size);

  win = new BrowserWindow({
    width: size.w,
    height: size.h,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    resizable: false,        // 自己控制 resize，禁掉系统的
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
      // 开 <webview> 标签：B 站播放器放进独立 webContents，
      // 我们用 webview.executeJavaScript() 注入 CSS、调 video.pause/seek。
      // 比 webSecurity:false + 操作 iframe DOM 更稳，进程隔离也更安全。
      webviewTag: true,
    },
  });

  win.setAlwaysOnTop(true, 'floating');

  // 想看 devtools 排查问题时：BROADCAST_DEVTOOLS=1 open dist/mac-arm64/Broadcast.app
  if (process.env.BROADCAST_DEVTOOLS) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

export function setWindowMode(mode: 'folded' | 'expanded', config: Config) {
  if (!win) return;
  currentMode = mode;

  const b = win.getBounds();
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;

  if (mode === 'folded') {
    // 以播放器中心为锚 → 折叠到 petSize
    const ps = config.windowState.petSize;
    const pos = clampPosition(
      { x: Math.round(cx - ps / 2), y: Math.round(cy - ps / 2) },
      { w: ps, h: ps }
    );
    win.setBounds({ x: pos.x, y: pos.y, width: ps, height: ps }, false);
  } else {
    // 以宠物中心为锚 → 展开到上次记忆的尺寸
    const size = config.windowState.playerSize;
    const pos = clampPosition(
      { x: Math.round(cx - size.w / 2), y: Math.round(cy - size.h / 2) },
      size
    );
    win.setBounds({ x: pos.x, y: pos.y, width: size.w, height: size.h }, false);
  }
}

export function resizePlayer(w: number, h: number) {
  if (!win || currentMode !== 'expanded') return;
  const b = win.getBounds();
  win.setBounds({ x: b.x, y: b.y, width: w, height: h }, false);
}

/** 折叠态调宠物大小，以当前中心为锚向外缩放 */
export function resizePet(s: number) {
  if (!win || currentMode !== 'folded') return;
  const b = win.getBounds();
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  win.setBounds({
    x: Math.round(cx - s / 2),
    y: Math.round(cy - s / 2),
    width: s,
    height: s,
  }, false);
}

export function movePlayer(x: number, y: number) {
  if (!win) return;
  win.setPosition(x, y, false);
}

export function setMuted(muted: boolean) {
  if (!win) return;
  win.webContents.setAudioMuted(muted);
}

export function getWin(): BrowserWindow | null {
  return win;
}
