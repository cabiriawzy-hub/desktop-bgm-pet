// src/main/window.ts
import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import type { Config, WindowState } from '../shared/types';

let win: BrowserWindow | null = null;
let currentMode: 'folded' | 'expanded' = 'folded';

/**
 * 启动时用：校验位置是否在某个显示器范围内，否则归位到主屏中心。
 * 用 -1 当 "未设置" sentinel。
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

/**
 * 拖拽/缩放时用：把位置软贴在最近显示器的可视区域里，最多贴边，不会飞出屏。
 * 比 clampPosition 温和，不会突然把窗口拽回中心。
 */
function softClamp(
  pos: { x: number; y: number },
  size: { w: number; h: number }
): { x: number; y: number } {
  const displays = screen.getAllDisplays();
  // 找跟窗口中心最近的 display
  const pcx = pos.x + size.w / 2;
  const pcy = pos.y + size.h / 2;
  let best = displays[0].workArea;
  let bestDist = Infinity;
  for (const d of displays) {
    const a = d.workArea;
    const ccx = a.x + a.width / 2;
    const ccy = a.y + a.height / 2;
    const dist = (ccx - pcx) ** 2 + (ccy - pcy) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = a;
    }
  }
  // 至少留 24px 在屏内（防止整窗滑出导致彻底丢失）
  const PAD = 24;
  return {
    x: Math.max(best.x - size.w + PAD, Math.min(best.x + best.width - PAD, pos.x)),
    y: Math.max(best.y, Math.min(best.y + best.height - PAD, pos.y)),
  };
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
    backgroundColor: '#00000000',
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    // 没获得焦点时也接收鼠标事件，wheel 才能稳
    acceptFirstMouse: true,
    vibrancy: undefined,
    visualEffectState: 'inactive',
    focusable: true,
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

  // Electron 33 + macOS Sequoia 的已知透明窗 bug 修复：
  // - setBackgroundColor 强制窗口背景为完全透明
  // - setVibrancy(null) 显式禁用任何附加的 vibrancy 合成层
  // - setBackgroundMaterial('none') 同上（Win/Linux 上是 no-op）
  // 三个一起堵漏，社区里这是已知 workaround
  win.setBackgroundColor('#00000000');
  try { win.setVibrancy(null as any); } catch { /* not supported on this platform */ }

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
  const pos = softClamp(
    { x: Math.round(cx - s / 2), y: Math.round(cy - s / 2) },
    { w: s, h: s }
  );
  win.setBounds({ x: pos.x, y: pos.y, width: s, height: s }, false);
}

export function movePlayer(x: number, y: number) {
  if (!win) return;
  const b = win.getBounds();
  const pos = softClamp({ x, y }, { w: b.width, h: b.height });
  win.setPosition(pos.x, pos.y, false);
}

/** 把当前窗口的实际位置和大小写回 config —— 拖完/缩完之后调用 */
export function getCurrentBounds(): { x: number; y: number; w: number; h: number } | null {
  if (!win) return null;
  const b = win.getBounds();
  return { x: b.x, y: b.y, w: b.width, h: b.height };
}

export function setMuted(muted: boolean) {
  if (!win) return;
  win.webContents.setAudioMuted(muted);
}

export function getWin(): BrowserWindow | null {
  return win;
}
