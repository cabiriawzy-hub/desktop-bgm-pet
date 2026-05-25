// src/main/window.ts
import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import type { Config, WindowState } from '../shared/types';

const PET_SIZE = 80;

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
    ? { w: PET_SIZE, h: PET_SIZE }
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
      // 关 same-origin policy，让我们能伸手进 B 站 iframe DOM：
      // 1) 注入 CSS 隐藏 B 站自带 chrome（"进入哔哩哔哩"等）
      // 2) 直接 video.pause()/play()/seek 实现真·暂停 + 拖动
      // 风险：iframe 内 JS 能反向访问 window.parent。对桌面单用户 + B 站可信源，
      // 实际威胁≈0。商业场景请改用 <webview>/BrowserView 隔离。
      webSecurity: false,
    },
  });

  win.setAlwaysOnTop(true, 'floating');

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
    // 以播放器中心为锚 → 折叠到 80×80
    const pos = clampPosition(
      { x: Math.round(cx - PET_SIZE / 2), y: Math.round(cy - PET_SIZE / 2) },
      { w: PET_SIZE, h: PET_SIZE }
    );
    win.setBounds({ x: pos.x, y: pos.y, width: PET_SIZE, height: PET_SIZE }, false);
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
