# 桌面 BGM 宠物 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个 macOS 桌面 BGM 播放器宠物，从 B 站 UP 主合集拉取视频列表，支持折叠/展开两态、多合集切换、置顶显示。

**Architecture:** Electron 单窗口应用，主进程负责窗口管理 + B 站 API 调用 + 持久化；渲染进程 React + zustand 处理两态 UI（折叠态显示 emoji 宠物，展开态嵌 B 站 iframe 播放器）。

**Tech Stack:** Electron + TypeScript + React + electron-vite + Zustand + electron-store + Vitest

**Project root:** `/Users/bytedance/Desktop/CC playground/broadcast/`

**Visual reference:** `demo.html` 在项目根目录，是完整的 UI 原型。所有 React 组件可以从它的 CSS/JS 直接移植样式和交互逻辑。

**Design spec:** `docs/superpowers/specs/2026-05-25-desktop-bgm-pet-design.md`

---

## Task 0: 项目脚手架 + 依赖安装

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `electron.vite.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/main/index.ts`（stub）
- Create: `src/preload/index.ts`（stub）
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`（stub）

- [ ] **Step 1: 初始化 git 仓库**

```bash
cd "/Users/bytedance/Desktop/CC playground/broadcast"
git init
git add demo.html docs/
git commit -m "chore: initial commit with design spec and UI prototype"
```

- [ ] **Step 2: 创建 `.gitignore`**

```
node_modules/
out/
dist/
*.log
.DS_Store
```

- [ ] **Step 3: 创建 `package.json`**

```json
{
  "name": "broadcast",
  "version": "0.1.0",
  "description": "Desktop BGM pet that plays Bilibili 合集 videos",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "start": "electron-vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "package": "electron-vite build && electron-builder --mac"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0",
    "electron-vite": "^2.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.2.0"
  },
  "dependencies": {
    "electron-store": "^8.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.5.0"
  },
  "build": {
    "appId": "com.broadcast.app",
    "productName": "Broadcast",
    "mac": {
      "category": "public.app-category.music"
    },
    "files": ["out/**/*", "resources/**/*"]
  }
}
```

- [ ] **Step 4: 创建三个 tsconfig**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

`tsconfig.node.json` （main + preload）:
```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*", "electron.vite.config.ts", "vitest.config.ts"]
}
```

`tsconfig.web.json` （renderer）:
```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ES2022"]
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

- [ ] **Step 5: 创建 `electron.vite.config.ts`**

```ts
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
      },
    },
  },
});
```

- [ ] **Step 6: 创建 `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 7: 创建 stub 文件**

`src/main/index.ts`:
```ts
import { app, BrowserWindow } from 'electron';

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 360,
    height: 240,
    webPreferences: {
      preload: new URL('../preload/index.js', import.meta.url).pathname,
    },
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile('out/renderer/index.html');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

`src/preload/index.ts`:
```ts
// stub - will be filled in Task 5
```

`src/renderer/index.html`:
```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Broadcast</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`src/renderer/main.tsx`:
```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <h1 style={{ color: 'white', fontFamily: 'sans-serif', padding: 20 }}>
    Broadcast — hello world
  </h1>
);
```

- [ ] **Step 8: 安装依赖**

```bash
npm install
```

Expected: 全部安装完毕，无 error（warning 可忽略）。

- [ ] **Step 9: 跑 dev 验证脚手架可用**

```bash
npm run dev
```

Expected: 一个白色背景的 Electron 窗口弹出，里面显示 "Broadcast — hello world"。

按 Ctrl+C 退出。

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: scaffold electron-vite + react + vitest project"
```

---

## Task 1: 共享类型定义

**Files:**
- Create: `src/shared/types.ts`

- [ ] **Step 1: 创建类型文件**

```ts
// src/shared/types.ts

export type PlayMode = 'sequential' | 'shuffle' | 'loop';

export type Video = {
  bvid: string;
  title: string;
  cover: string;        // 封面 URL
  duration: number;     // 秒
};

export type Source = {
  id: string;           // uuid
  name: string;         // 合集名（从 B 站 API meta.name）
  mid: string;          // UP 主 uid（用 string，B 站新号 mid 超过 JS 安全整数）
  seasonId: string;
  videos: Video[];
  lastFetched: number;  // unix ms
};

export type WindowState = {
  mode: 'folded' | 'expanded';
  petPos: { x: number; y: number };
  playerPos: { x: number; y: number };
  playerSize: { w: number; h: number };
};

export type Config = {
  sources: Source[];
  currentSourceId: string | null;
  currentBvid: string | null;
  playMode: PlayMode;
  muted: boolean;
  petEmoji: string;
  windowState: WindowState;
};

export const DEFAULT_CONFIG: Config = {
  sources: [],
  currentSourceId: null,
  currentBvid: null,
  playMode: 'sequential',
  muted: false,
  petEmoji: '🪩',
  windowState: {
    mode: 'folded',
    petPos: { x: -1, y: -1 },    // -1 表示"未设置"，启动时归位到屏幕中心
    playerPos: { x: -1, y: -1 },
    playerSize: { w: 360, h: 240 },
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: shared types for config, source, video"
```

---

## Task 2: B 站合集 URL 解析（TDD）

**Files:**
- Create: `src/shared/bilibili-url.ts`
- Create: `src/shared/bilibili-url.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/shared/bilibili-url.test.ts
import { describe, it, expect } from 'vitest';
import { parseSeasonURL } from './bilibili-url';

describe('parseSeasonURL', () => {
  it('parses a standard season URL', () => {
    const url = 'https://space.bilibili.com/55491826/lists/3300721?type=season';
    expect(parseSeasonURL(url)).toEqual({ mid: '55491826', seasonId: '3300721' });
  });

  it('handles a 16-digit mid (new account)', () => {
    const url = 'https://space.bilibili.com/3690985372519123/lists/6971509?type=season';
    expect(parseSeasonURL(url)).toEqual({ mid: '3690985372519123', seasonId: '6971509' });
  });

  it('rejects URLs without type=season', () => {
    const url = 'https://space.bilibili.com/55491826/lists/3300721';
    expect(() => parseSeasonURL(url)).toThrow(/type=season/);
  });

  it('rejects type=collect (个人收藏夹)', () => {
    const url = 'https://space.bilibili.com/55491826/lists/3300721?type=collect';
    expect(() => parseSeasonURL(url)).toThrow(/只支持.*合集/);
  });

  it('rejects type=series (UP 视频列表)', () => {
    const url = 'https://space.bilibili.com/55491826/lists/3300721?type=series';
    expect(() => parseSeasonURL(url)).toThrow(/只支持.*合集/);
  });

  it('rejects non-bilibili URLs', () => {
    expect(() => parseSeasonURL('https://example.com/foo')).toThrow(/B 站合集 URL/);
  });

  it('rejects garbage input', () => {
    expect(() => parseSeasonURL('not a url')).toThrow(/B 站合集 URL/);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npm test
```

Expected: 所有 7 个测试失败 with "parseSeasonURL is not a function" 或 "Cannot find module"。

- [ ] **Step 3: 写实现**

```ts
// src/shared/bilibili-url.ts

export type SeasonRef = { mid: string; seasonId: string };

const SEASON_PATH_RE = /^https?:\/\/space\.bilibili\.com\/(\d+)\/lists\/(\d+)\/?$/;

/**
 * 解析 B 站 UP 主合集 URL。
 * 接受格式：https://space.bilibili.com/{mid}/lists/{season_id}?type=season
 * 只支持 type=season。type=collect / type=series 抛出明确错误。
 */
export function parseSeasonURL(input: string): SeasonRef {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('不是合法的 B 站合集 URL');
  }

  if (url.hostname !== 'space.bilibili.com') {
    throw new Error('不是合法的 B 站合集 URL');
  }

  const m = SEASON_PATH_RE.exec(`${url.protocol}//${url.host}${url.pathname}`);
  if (!m) {
    throw new Error('不是合法的 B 站合集 URL');
  }

  const type = url.searchParams.get('type');
  if (type !== 'season') {
    if (type === 'collect') {
      throw new Error('目前只支持 UP 主的「合集」，你贴的是「个人收藏夹」(type=collect)，请到 B 站打开合集页再复制 URL');
    }
    if (type === 'series') {
      throw new Error('目前只支持 UP 主的「合集」，你贴的是「视频列表」(type=series)，请到 B 站打开合集页再复制 URL');
    }
    throw new Error('URL 缺少 type=season 参数');
  }

  return { mid: m[1], seasonId: m[2] };
}
```

- [ ] **Step 4: 跑测试确认全过**

```bash
npm test
```

Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/bilibili-url.ts src/shared/bilibili-url.test.ts
git commit -m "feat: parse B 站 season URL with strict type=season validation"
```

---

## Task 3: B 站 API 客户端（TDD with mock fetcher）

**Files:**
- Create: `src/main/bilibili-api.ts`
- Create: `src/main/bilibili-api.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/main/bilibili-api.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchSeasonArchives } from './bilibili-api';

function mockJsonResponse(data: any) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  } as unknown as Response;
}

describe('fetchSeasonArchives', () => {
  it('returns parsed videos on success', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: {
        meta: { name: '测试合集', total: 2, mid: 55491826 },
        archives: [
          { bvid: 'BV1aaa', title: '第一首', duration: 180, pic: 'http://pic1' },
          { bvid: 'BV1bbb', title: '第二首', duration: 240, pic: 'http://pic2' },
        ],
      },
    }));

    const result = await fetchSeasonArchives('55491826', '3300721', mockFetch);

    expect(result.name).toBe('测试合集');
    expect(result.videos).toEqual([
      { bvid: 'BV1aaa', title: '第一首', duration: 180, cover: 'http://pic1' },
      { bvid: 'BV1bbb', title: '第二首', duration: 240, cover: 'http://pic2' },
    ]);
  });

  it('paginates until total is reached', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: {
          meta: { name: '大合集', total: 35, mid: 1 },
          archives: Array.from({ length: 30 }, (_, i) => ({
            bvid: `BV${i}`, title: `t${i}`, duration: 60, pic: 'p',
          })),
        },
      }))
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: {
          meta: { name: '大合集', total: 35, mid: 1 },
          archives: Array.from({ length: 5 }, (_, i) => ({
            bvid: `BV${30 + i}`, title: `t${30 + i}`, duration: 60, pic: 'p',
          })),
        },
      }));

    const result = await fetchSeasonArchives('1', '2', mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.videos).toHaveLength(35);
    expect(result.videos[34].bvid).toBe('BV34');
  });

  it('throws on B 站 风控 code', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: -352, message: '风控',
    }));

    await expect(fetchSeasonArchives('1', '2', mockFetch)).rejects.toThrow(/-352/);
  });

  it('sends required headers (UA, Referer, Origin)', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: { meta: { name: 'x', total: 0, mid: 1 }, archives: [] },
    }));

    await fetchSeasonArchives('55491826', '3300721', mockFetch);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['User-Agent']).toMatch(/Mozilla/);
    expect(options.headers['Referer']).toContain('space.bilibili.com/55491826/lists/3300721');
    expect(options.headers['Origin']).toBe('https://space.bilibili.com');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npm test
```

Expected: 4 个测试失败 with module not found 错误。

- [ ] **Step 3: 写实现**

```ts
// src/main/bilibili-api.ts
import type { Video } from '../shared/types';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PAGE_SIZE = 30;

export type SeasonData = {
  name: string;
  videos: Video[];
};

type Fetcher = (url: string, options: any) => Promise<Response>;

type ApiResponse = {
  code: number;
  message?: string;
  data?: {
    meta: { name: string; total: number; mid: number | string };
    archives: Array<{
      bvid: string;
      title: string;
      duration: number;
      pic: string;
    }>;
  };
};

/**
 * 拉取一个合集的所有视频。会自动分页直到拿到 meta.total 个。
 * 必须由主进程调用（net.fetch 走 Electron 网络栈，绕开 CORS）。
 */
export async function fetchSeasonArchives(
  mid: string,
  seasonId: string,
  fetcher: Fetcher
): Promise<SeasonData> {
  const referer = `https://space.bilibili.com/${mid}/lists/${seasonId}?type=season`;
  const headers = {
    'User-Agent': UA,
    'Referer': referer,
    'Origin': 'https://space.bilibili.com',
  };

  let name = '';
  const videos: Video[] = [];
  let page = 1;
  let total = Infinity;

  while (videos.length < total) {
    const url = `https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid=${mid}&season_id=${seasonId}&page_num=${page}&page_size=${PAGE_SIZE}`;
    const res = await fetcher(url, { headers });
    const json = (await res.json()) as ApiResponse;

    if (json.code !== 0 || !json.data) {
      throw new Error(`B 站 API 失败 (code=${json.code}): ${json.message ?? 'unknown'}`);
    }

    if (page === 1) {
      name = json.data.meta.name;
      total = json.data.meta.total;
    }

    for (const a of json.data.archives) {
      videos.push({
        bvid: a.bvid,
        title: a.title,
        duration: a.duration,
        cover: a.pic,
      });
    }

    if (json.data.archives.length < PAGE_SIZE) break;
    page++;
  }

  return { name, videos };
}
```

- [ ] **Step 4: 跑测试确认全过**

```bash
npm test
```

Expected: 11 passed (Task 2 的 7 个 + 这里 4 个).

- [ ] **Step 5: Commit**

```bash
git add src/main/bilibili-api.ts src/main/bilibili-api.test.ts
git commit -m "feat: bilibili season archives fetcher with pagination and browser headers"
```

---

## Task 4: 持久化存储封装

**Files:**
- Create: `src/main/store.ts`

- [ ] **Step 1: 创建 store 封装**

```ts
// src/main/store.ts
import Store from 'electron-store';
import type { Config } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/types';

const store = new Store<Config>({
  name: 'config',
  defaults: DEFAULT_CONFIG,
});

export function getConfig(): Config {
  return store.store;
}

export function setConfig(updater: (cfg: Config) => Config): Config {
  const next = updater(store.store);
  store.store = next;
  return next;
}

export function resetConfig(): void {
  store.clear();
}

// 暴露存储路径方便排查
export function getConfigPath(): string {
  return store.path;
}
```

- [ ] **Step 2: 验证编译通过**

```bash
npx tsc -p tsconfig.node.json --noEmit
```

Expected: 无错误输出。

- [ ] **Step 3: Commit**

```bash
git add src/main/store.ts
git commit -m "feat: electron-store wrapper with typed Config"
```

---

## Task 5: IPC 协议 + Preload Bridge

**Files:**
- Create: `src/shared/ipc-channels.ts`
- Modify: `src/preload/index.ts`
- Create: `src/main/ipc.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: 定义 IPC channel 常量**

```ts
// src/shared/ipc-channels.ts
export const IPC = {
  GetConfig: 'config:get',
  AddSource: 'source:add',
  RemoveSource: 'source:remove',
  RefreshSource: 'source:refresh',
  SetCurrent: 'playback:set-current',
  SetPlayMode: 'playback:set-mode',
  SetMuted: 'playback:set-muted',
  SetEmoji: 'pet:set-emoji',
  SetWindowMode: 'window:set-mode',
  UpdateWindowGeometry: 'window:update-geometry',
  Quit: 'app:quit',
} as const;

export type AddSourcePayload = { url: string };
export type RemoveSourcePayload = { id: string };
export type RefreshSourcePayload = { id: string };
export type SetCurrentPayload = { sourceId: string; bvid: string };
export type SetPlayModePayload = { mode: 'sequential' | 'shuffle' | 'loop' };
export type SetMutedPayload = { muted: boolean };
export type SetEmojiPayload = { emoji: string };
export type SetWindowModePayload = { mode: 'folded' | 'expanded' };
export type UpdateWindowGeometryPayload = {
  petPos?: { x: number; y: number };
  playerPos?: { x: number; y: number };
  playerSize?: { w: number; h: number };
};
```

- [ ] **Step 2: 写 preload bridge**

```ts
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type {
  AddSourcePayload, RemoveSourcePayload, RefreshSourcePayload,
  SetCurrentPayload, SetPlayModePayload, SetMutedPayload, SetEmojiPayload,
  SetWindowModePayload, UpdateWindowGeometryPayload,
} from '../shared/ipc-channels';
import type { Config } from '../shared/types';

const api = {
  getConfig: (): Promise<Config> => ipcRenderer.invoke(IPC.GetConfig),
  addSource: (p: AddSourcePayload): Promise<Config> => ipcRenderer.invoke(IPC.AddSource, p),
  removeSource: (p: RemoveSourcePayload): Promise<Config> => ipcRenderer.invoke(IPC.RemoveSource, p),
  refreshSource: (p: RefreshSourcePayload): Promise<Config> => ipcRenderer.invoke(IPC.RefreshSource, p),
  setCurrent: (p: SetCurrentPayload): Promise<Config> => ipcRenderer.invoke(IPC.SetCurrent, p),
  setPlayMode: (p: SetPlayModePayload): Promise<Config> => ipcRenderer.invoke(IPC.SetPlayMode, p),
  setMuted: (p: SetMutedPayload): Promise<Config> => ipcRenderer.invoke(IPC.SetMuted, p),
  setEmoji: (p: SetEmojiPayload): Promise<Config> => ipcRenderer.invoke(IPC.SetEmoji, p),
  setWindowMode: (p: SetWindowModePayload): Promise<void> => ipcRenderer.invoke(IPC.SetWindowMode, p),
  updateWindowGeometry: (p: UpdateWindowGeometryPayload): Promise<void> => ipcRenderer.invoke(IPC.UpdateWindowGeometry, p),
  quit: (): Promise<void> => ipcRenderer.invoke(IPC.Quit),
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
```

- [ ] **Step 3: 写主进程 IPC handlers（先 stub，后续 task 填充窗口/播放具体逻辑）**

```ts
// src/main/ipc.ts
import { ipcMain, app, net } from 'electron';
import { randomUUID } from 'crypto';
import { IPC } from '../shared/ipc-channels';
import type {
  AddSourcePayload, RemoveSourcePayload, RefreshSourcePayload,
  SetCurrentPayload, SetPlayModePayload, SetMutedPayload, SetEmojiPayload,
  SetWindowModePayload, UpdateWindowGeometryPayload,
} from '../shared/ipc-channels';
import { getConfig, setConfig } from './store';
import { parseSeasonURL } from '../shared/bilibili-url';
import { fetchSeasonArchives } from './bilibili-api';

export function registerIpcHandlers(opts: {
  onSetWindowMode: (mode: 'folded' | 'expanded') => void;
  onUpdateGeometry: (p: UpdateWindowGeometryPayload) => void;
  onSetMuted: (muted: boolean) => void;
}) {
  ipcMain.handle(IPC.GetConfig, () => getConfig());

  ipcMain.handle(IPC.AddSource, async (_e, { url }: AddSourcePayload) => {
    const { mid, seasonId } = parseSeasonURL(url);
    const data = await fetchSeasonArchives(mid, seasonId, net.fetch as any);
    return setConfig(cfg => {
      const newSource = {
        id: randomUUID(),
        name: data.name,
        mid,
        seasonId,
        videos: data.videos,
        lastFetched: Date.now(),
      };
      const sources = [...cfg.sources, newSource];
      // 第一次添加 → 自动选中第一首
      const currentSourceId = cfg.currentSourceId ?? newSource.id;
      const currentBvid = cfg.currentBvid ?? (newSource.videos[0]?.bvid ?? null);
      return { ...cfg, sources, currentSourceId, currentBvid };
    });
  });

  ipcMain.handle(IPC.RemoveSource, (_e, { id }: RemoveSourcePayload) => {
    return setConfig(cfg => {
      const sources = cfg.sources.filter(s => s.id !== id);
      const currentSourceId = cfg.currentSourceId === id ? null : cfg.currentSourceId;
      const currentBvid = cfg.currentSourceId === id ? null : cfg.currentBvid;
      return { ...cfg, sources, currentSourceId, currentBvid };
    });
  });

  ipcMain.handle(IPC.RefreshSource, async (_e, { id }: RefreshSourcePayload) => {
    const cfg = getConfig();
    const src = cfg.sources.find(s => s.id === id);
    if (!src) throw new Error('source not found');
    const data = await fetchSeasonArchives(src.mid, src.seasonId, net.fetch as any);
    return setConfig(cfg => ({
      ...cfg,
      sources: cfg.sources.map(s =>
        s.id === id ? { ...s, name: data.name, videos: data.videos, lastFetched: Date.now() } : s
      ),
    }));
  });

  ipcMain.handle(IPC.SetCurrent, (_e, { sourceId, bvid }: SetCurrentPayload) => {
    return setConfig(cfg => ({ ...cfg, currentSourceId: sourceId, currentBvid: bvid }));
  });

  ipcMain.handle(IPC.SetPlayMode, (_e, { mode }: SetPlayModePayload) => {
    return setConfig(cfg => ({ ...cfg, playMode: mode }));
  });

  ipcMain.handle(IPC.SetMuted, (_e, { muted }: SetMutedPayload) => {
    opts.onSetMuted(muted);
    return setConfig(cfg => ({ ...cfg, muted }));
  });

  ipcMain.handle(IPC.SetEmoji, (_e, { emoji }: SetEmojiPayload) => {
    return setConfig(cfg => ({ ...cfg, petEmoji: emoji }));
  });

  ipcMain.handle(IPC.SetWindowMode, (_e, { mode }: SetWindowModePayload) => {
    opts.onSetWindowMode(mode);
    setConfig(cfg => ({ ...cfg, windowState: { ...cfg.windowState, mode } }));
  });

  ipcMain.handle(IPC.UpdateWindowGeometry, (_e, p: UpdateWindowGeometryPayload) => {
    opts.onUpdateGeometry(p);
    setConfig(cfg => ({
      ...cfg,
      windowState: {
        ...cfg.windowState,
        petPos: p.petPos ?? cfg.windowState.petPos,
        playerPos: p.playerPos ?? cfg.windowState.playerPos,
        playerSize: p.playerSize ?? cfg.windowState.playerSize,
      },
    }));
  });

  ipcMain.handle(IPC.Quit, () => app.quit());
}
```

- [ ] **Step 4: 更新 main 入口 wire 上 preload 和 IPC（窗口仍是 stub）**

```ts
// src/main/index.ts
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
```

- [ ] **Step 5: 跑 dev 确认仍然能起来**

```bash
npm run dev
```

Expected: 窗口弹出（仍是 hello world）。开发者工具 console 没有 preload 报错。按 Ctrl+C 退出。

- [ ] **Step 6: Commit**

```bash
git add src/shared/ipc-channels.ts src/preload/index.ts src/main/ipc.ts src/main/index.ts
git commit -m "feat: IPC contract with preload bridge and main process handlers"
```

---

## Task 6: 窗口管理（透明、置顶、两态切换）

**Files:**
- Create: `src/main/window.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: 写窗口模块**

```ts
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

  if (mode === 'folded') {
    // 以播放器中心为锚 → 折叠到 80×80
    const [cx, cy] = win.getBounds() ? [
      win.getBounds().x + win.getBounds().width / 2,
      win.getBounds().y + win.getBounds().height / 2,
    ] : [0, 0];
    const pos = clampPosition(
      { x: Math.round(cx - PET_SIZE / 2), y: Math.round(cy - PET_SIZE / 2) },
      { w: PET_SIZE, h: PET_SIZE }
    );
    win.setBounds({ x: pos.x, y: pos.y, width: PET_SIZE, height: PET_SIZE }, false);
  } else {
    // 以宠物中心为锚 → 展开到上次记忆的尺寸
    const b = win.getBounds();
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
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
```

- [ ] **Step 2: 在主入口接入 window 模块**

```ts
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
```

- [ ] **Step 3: 跑 dev 验证窗口透明、置顶**

```bash
npm run dev
```

Expected: 一个 80×80 的透明窗口出现在屏幕中央，里面只有 hello world 文字（背景透明能看到桌面）。开任意其他应用，broadcast 窗口仍在最前。

按 Ctrl+C 退出。

- [ ] **Step 4: Commit**

```bash
git add src/main/window.ts src/main/index.ts
git commit -m "feat: transparent always-on-top window with two-state sizing"
```

---

## Task 7: Renderer 状态层 + API wrapper

**Files:**
- Create: `src/renderer/api.ts`
- Create: `src/renderer/state.ts`
- Modify: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`

- [ ] **Step 1: 给 window.api 加 TS 类型声明**

```ts
// src/renderer/api.ts
import type { Api } from '../preload/index';

declare global {
  interface Window {
    api: Api;
  }
}

export const api = window.api;
```

- [ ] **Step 2: 创建 zustand store**

```ts
// src/renderer/state.ts
import { create } from 'zustand';
import type { Config } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/types';
import { api } from './api';

type State = {
  config: Config;
  ready: boolean;
  hydrate: () => Promise<void>;
  setConfig: (cfg: Config) => void;
};

export const useStore = create<State>((set) => ({
  config: DEFAULT_CONFIG,
  ready: false,
  hydrate: async () => {
    const cfg = await api.getConfig();
    set({ config: cfg, ready: true });
    // 启动后异步刷新所有合集，差异更新本地缓存（spec §4.3）
    for (const src of cfg.sources) {
      api.refreshSource({ id: src.id })
        .then(updated => set({ config: updated }))
        .catch(err => console.warn(`refresh "${src.name}" failed:`, err));
    }
  },
  setConfig: (config) => set({ config }),
}));
```

- [ ] **Step 3: 创建 App.tsx 根据 mode 路由**

```tsx
// src/renderer/App.tsx
import { useEffect } from 'react';
import { useStore } from './state';

export default function App() {
  const ready = useStore(s => s.ready);
  const hydrate = useStore(s => s.hydrate);
  const mode = useStore(s => s.config.windowState.mode);

  useEffect(() => { hydrate(); }, [hydrate]);

  if (!ready) return null;

  return mode === 'folded' ? <div>folded stub</div> : <div>expanded stub</div>;
}
```

- [ ] **Step 4: 更新 main.tsx**

```tsx
// src/renderer/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

- [ ] **Step 5: 给 index.html 加全局 CSS reset（背景透明）**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Broadcast</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #root {
        width: 100%; height: 100%;
        background: transparent;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
        color: white;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: 跑 dev 验证**

```bash
npm run dev
```

Expected: 80×80 透明窗口里显示 "folded stub" 白色文字。按 Ctrl+C 退出。

- [ ] **Step 7: Commit**

```bash
git add src/renderer/api.ts src/renderer/state.ts src/renderer/App.tsx src/renderer/main.tsx src/renderer/index.html
git commit -m "feat: renderer state layer with zustand + api bridge"
```

---

## Task 8: 折叠态宠物组件

**Files:**
- Create: `src/renderer/components/FoldedPet.tsx`
- Modify: `src/renderer/App.tsx`

参考：移植 `demo.html` 中 `.pet` 的 CSS 和拖拽逻辑。

- [ ] **Step 1: 创建 FoldedPet 组件**

```tsx
// src/renderer/components/FoldedPet.tsx
import { useRef } from 'react';
import { useStore } from '../state';
import { api } from '../api';

export function FoldedPet() {
  const emoji = useStore(s => s.config.petEmoji);
  const hasSource = useStore(s => s.config.sources.length > 0);
  const setConfig = useStore(s => s.setConfig);

  // 区分拖拽 vs 单击：mousedown 记录起点，mouseup 时距离 < 3px 才算点击
  const dragState = useRef({ down: false, didDrag: false, startX: 0, startY: 0, startScreenX: 0, startScreenY: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragState.current = {
      down: true,
      didDrag: false,
      startX: e.screenX,
      startY: e.screenY,
      startScreenX: window.screenX,
      startScreenY: window.screenY,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const s = dragState.current;
    if (!s.down) return;
    const dx = e.screenX - s.startX;
    const dy = e.screenY - s.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) s.didDrag = true;
    if (s.didDrag) {
      const nx = s.startScreenX + dx;
      const ny = s.startScreenY + dy;
      api.updateWindowGeometry({ petPos: { x: nx, y: ny } });
    }
  };

  const onMouseUp = async (e: React.MouseEvent) => {
    const s = dragState.current;
    s.down = false;
    if (s.didDrag) return;
    // 单击 → 展开
    const cfg = useStore.getState().config;
    setConfig({ ...cfg, windowState: { ...cfg.windowState, mode: 'expanded' } });
    await api.setWindowMode({ mode: 'expanded' });
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // 右键菜单交给 ContextMenu 组件（Task 11 接入），这里只 stub
    // 暂时用原生 alert 占位
  };

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onContextMenu={onContextMenu}
      style={{
        width: 80,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 56,
        cursor: 'grab',
        userSelect: 'none',
        position: 'relative',
        filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.55))',
        animation: 'bob 4s ease-in-out infinite',
      }}
    >
      {emoji}
      {hasSource && (
        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#ff5a5a',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.4), 0 0 12px rgba(255,90,90,0.8)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}
      <style>{`
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: 接入 App.tsx**

```tsx
// src/renderer/App.tsx
import { useEffect } from 'react';
import { useStore } from './state';
import { FoldedPet } from './components/FoldedPet';

export default function App() {
  const ready = useStore(s => s.ready);
  const hydrate = useStore(s => s.hydrate);
  const mode = useStore(s => s.config.windowState.mode);

  useEffect(() => { hydrate(); }, [hydrate]);

  if (!ready) return null;

  return mode === 'folded' ? <FoldedPet /> : <div>expanded stub</div>;
}
```

- [ ] **Step 3: 跑 dev 验证**

```bash
npm run dev
```

Expected:
- 屏幕中央出现 🪩 emoji（带阴影、轻微上下浮动）
- 拖动它会移动整个窗口位置
- 单击它窗口变成 360×240（变成 "expanded stub" 字）
- 没有合集时不显示红点
- 按 Ctrl+C 退出

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/FoldedPet.tsx src/renderer/App.tsx
git commit -m "feat: folded pet component with drag and click-to-expand"
```

---

## Task 9: 展开态布局 + 空状态 + iframe

**Files:**
- Create: `src/renderer/components/ExpandedPlayer.tsx`
- Create: `src/renderer/components/EmptyState.tsx`
- Create: `src/renderer/components/BilibiliFrame.tsx`
- Create: `src/renderer/components/TitleBar.tsx`
- Create: `src/renderer/components/ResizeHandle.tsx`
- Modify: `src/renderer/App.tsx`

参考：`demo.html` 中 `.player` / `.title-bar` / `.video-area` / `.resize-handle` 的 CSS。

- [ ] **Step 1: 创建 BilibiliFrame**

```tsx
// src/renderer/components/BilibiliFrame.tsx
type Props = { bvid: string };

export function BilibiliFrame({ bvid }: Props) {
  const src = `//player.bilibili.com/player.html?bvid=${bvid}&autoplay=1&danmaku=0&hideCoverInfo=1`;
  return (
    <iframe
      key={bvid}                 /* key 确保切歌时重新加载 */
      src={src}
      allow="autoplay; fullscreen"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      }}
    />
  );
}
```

- [ ] **Step 2: 创建 TitleBar**

```tsx
// src/renderer/components/TitleBar.tsx
import { useRef } from 'react';
import { useStore } from '../state';
import { api } from '../api';

export function TitleBar() {
  const sources = useStore(s => s.config.sources);
  const currentSourceId = useStore(s => s.config.currentSourceId);
  const currentBvid = useStore(s => s.config.currentBvid);
  const setConfig = useStore(s => s.setConfig);

  const currentSource = sources.find(s => s.id === currentSourceId);
  const currentVideo = currentSource?.videos.find(v => v.bvid === currentBvid);
  const title = currentVideo?.title ?? '—';

  const dragState = useRef({ down: false, startX: 0, startY: 0, startScreenX: 0, startScreenY: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    dragState.current = {
      down: true,
      startX: e.screenX,
      startY: e.screenY,
      startScreenX: window.screenX,
      startScreenY: window.screenY,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const s = dragState.current;
    if (!s.down) return;
    const dx = e.screenX - s.startX;
    const dy = e.screenY - s.startY;
    api.updateWindowGeometry({ playerPos: { x: s.startScreenX + dx, y: s.startScreenY + dy } });
  };

  const onMouseUp = () => { dragState.current.down = false; };

  const onFold = async () => {
    const cfg = useStore.getState().config;
    setConfig({ ...cfg, windowState: { ...cfg.windowState, mode: 'folded' } });
    await api.setWindowMode({ mode: 'folded' });
  };

  return (
    <div
      className="title-bar"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{
        height: 32,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 10,
        cursor: 'grab',
      }}
    >
      <div style={{
        flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.85)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        fontWeight: 500,
      }}>{title}</div>
      <button
        onClick={onFold}
        style={{
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
          cursor: 'pointer', fontSize: 14, padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="收起"
      >−</button>
    </div>
  );
}
```

- [ ] **Step 3: 创建 ResizeHandle**

```tsx
// src/renderer/components/ResizeHandle.tsx
import { useEffect, useRef } from 'react';
import { useStore } from '../state';
import { api } from '../api';

export function ResizeHandle() {
  const setConfig = useStore(s => s.setConfig);
  const dragState = useRef({ down: false, startX: 0, startY: 0, startW: 0, startH: 0 });

  // 全局监听 mousemove/mouseup —— 拖到窗口外也要响应
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = dragState.current;
      if (!s.down) return;
      const w = Math.min(900, Math.max(240, s.startW + (e.screenX - s.startX)));
      const h = Math.min(600, Math.max(160, s.startH + (e.screenY - s.startY)));
      const cfg = useStore.getState().config;
      setConfig({ ...cfg, windowState: { ...cfg.windowState, playerSize: { w, h } } });
      api.updateWindowGeometry({ playerSize: { w, h } });
    };
    const onUp = () => { dragState.current.down = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [setConfig]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cfg = useStore.getState().config;
    dragState.current = {
      down: true,
      startX: e.screenX,
      startY: e.screenY,
      startW: cfg.windowState.playerSize.w,
      startH: cfg.windowState.playerSize.h,
    };
  };

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        bottom: 0, right: 0,
        width: 18, height: 18,
        cursor: 'nwse-resize',
        zIndex: 15,
      }}
    >
      <div style={{
        position: 'absolute',
        bottom: 4, right: 4,
        width: 0, height: 0,
        borderStyle: 'solid',
        borderWidth: '0 0 10px 10px',
        borderColor: 'transparent transparent rgba(255,255,255,0.35) transparent',
      }} />
    </div>
  );
}
```

- [ ] **Step 4: 创建 EmptyState**

```tsx
// src/renderer/components/EmptyState.tsx
import { useState } from 'react';
import { useStore } from '../state';
import { api } from '../api';

export function EmptyState() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setConfig = useStore(s => s.setConfig);

  const onAdd = async () => {
    if (!url.trim()) return;
    setError(null);
    setLoading(true);
    try {
      // AddSource IPC handler 内部已经处理「无 current 时自动选中第一首」
      const cfg = await api.addSource({ url: url.trim() });
      setConfig(cfg);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0a0a14',
      borderRadius: 16,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, gap: 12,
    }}>
      <div style={{ fontSize: 32 }}>🪩</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center' }}>
        粘贴一个 B 站合集 URL 来开始
      </div>
      <input
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://space.bilibili.com/.../lists/...?type=season"
        style={{
          width: '100%', padding: '6px 10px', fontSize: 12,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 6, color: '#fff', outline: 'none',
        }}
      />
      <button
        onClick={onAdd}
        disabled={loading}
        style={{
          padding: '6px 16px', fontSize: 12,
          background: '#5cb6ff', color: '#fff', border: 'none', borderRadius: 6,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >{loading ? '拉取中...' : '添加'}</button>
      {error && <div style={{ fontSize: 11, color: '#ff7878', textAlign: 'center' }}>{error}</div>}
    </div>
  );
}
```

- [ ] **Step 5: 创建 ExpandedPlayer 把这些组合起来**

```tsx
// src/renderer/components/ExpandedPlayer.tsx
import { useState } from 'react';
import { useStore } from '../state';
import { BilibiliFrame } from './BilibiliFrame';
import { TitleBar } from './TitleBar';
import { ResizeHandle } from './ResizeHandle';
import { EmptyState } from './EmptyState';

export function ExpandedPlayer() {
  const [hover, setHover] = useState(false);
  const sources = useStore(s => s.config.sources);
  const currentBvid = useStore(s => s.config.currentBvid);

  const isEmpty = sources.length === 0;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', height: '100%',
        borderRadius: 16,
        background: '#0a0a14',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {currentBvid && <BilibiliFrame bvid={currentBvid} />}
          <div style={{
            opacity: hover ? 1 : 0,
            transition: 'opacity 0.25s',
          }}>
            <TitleBar />
            {/* ControlBar 在 Task 10 加 */}
          </div>
          <ResizeHandle />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: 接入 App.tsx**

```tsx
// src/renderer/App.tsx
import { useEffect } from 'react';
import { useStore } from './state';
import { FoldedPet } from './components/FoldedPet';
import { ExpandedPlayer } from './components/ExpandedPlayer';

export default function App() {
  const ready = useStore(s => s.ready);
  const hydrate = useStore(s => s.hydrate);
  const mode = useStore(s => s.config.windowState.mode);

  useEffect(() => { hydrate(); }, [hydrate]);

  if (!ready) return null;

  return mode === 'folded' ? <FoldedPet /> : <ExpandedPlayer />;
}
```

- [ ] **Step 7: 跑 dev 验证空状态 → 添加合集 → 视频播放**

```bash
npm run dev
```

Expected:
- 启动后是折叠态 🪩。点击它 → 窗口变 360×240，显示空状态卡片
- 粘贴 `https://space.bilibili.com/55491826/lists/3300721?type=season` → 点添加
- 拉取成功后切换到 iframe 播放，能看到 B 站视频在播
- hover 视频窗 → 顶部标题栏淡入显示歌名 + 「−」按钮
- 拖右下角能改窗口大小
- 拖标题栏能移动窗口
- 点 「−」缩回 🪩

按 Ctrl+C 退出。

- [ ] **Step 8: Commit**

```bash
git add src/renderer/components/
git add src/renderer/App.tsx
git commit -m "feat: expanded player with iframe, title bar, resize, empty state"
```

---

## Task 10: 控件条 + 进度条 + 静音 + 源切换

**Files:**
- Create: `src/renderer/components/ProgressBar.tsx`
- Create: `src/renderer/components/SourceMenu.tsx`
- Create: `src/renderer/components/ControlBar.tsx`
- Create: `src/renderer/playback.ts`（播放控制纯函数）
- Modify: `src/renderer/components/ExpandedPlayer.tsx`

- [ ] **Step 1: 抽出播放控制纯函数（next/prev）**

```ts
// src/renderer/playback.ts
import type { Source, PlayMode, Video } from '../shared/types';

export function pickNext(source: Source, currentBvid: string | null, mode: PlayMode): Video | null {
  const videos = source.videos;
  if (videos.length === 0) return null;

  if (mode === 'loop' && currentBvid) {
    return videos.find(v => v.bvid === currentBvid) ?? videos[0];
  }

  if (mode === 'shuffle') {
    if (videos.length === 1) return videos[0];
    let next: Video;
    do {
      next = videos[Math.floor(Math.random() * videos.length)];
    } while (next.bvid === currentBvid);
    return next;
  }

  // sequential
  const idx = videos.findIndex(v => v.bvid === currentBvid);
  return videos[(idx + 1) % videos.length];
}

export function pickPrev(source: Source, currentBvid: string | null, mode: PlayMode): Video | null {
  const videos = source.videos;
  if (videos.length === 0) return null;
  if (mode === 'loop' && currentBvid) {
    return videos.find(v => v.bvid === currentBvid) ?? videos[0];
  }
  if (mode === 'shuffle') {
    return pickNext(source, currentBvid, mode);  // 随机时上一首=下一个随机
  }
  const idx = videos.findIndex(v => v.bvid === currentBvid);
  const prevIdx = idx <= 0 ? videos.length - 1 : idx - 1;
  return videos[prevIdx];
}
```

- [ ] **Step 2: 测试 playback.ts**

`src/renderer/playback.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { pickNext, pickPrev } from './playback';
import type { Source } from '../shared/types';

const src: Source = {
  id: 's1', name: 't', mid: '1', seasonId: '1', lastFetched: 0,
  videos: [
    { bvid: 'a', title: 'A', cover: '', duration: 60 },
    { bvid: 'b', title: 'B', cover: '', duration: 60 },
    { bvid: 'c', title: 'C', cover: '', duration: 60 },
  ],
};

describe('pickNext', () => {
  it('sequential: a → b → c → a', () => {
    expect(pickNext(src, 'a', 'sequential')?.bvid).toBe('b');
    expect(pickNext(src, 'b', 'sequential')?.bvid).toBe('c');
    expect(pickNext(src, 'c', 'sequential')?.bvid).toBe('a');
  });
  it('loop: stays on current', () => {
    expect(pickNext(src, 'b', 'loop')?.bvid).toBe('b');
  });
  it('shuffle: never picks current', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const next = pickNext(src, 'a', 'shuffle');
    expect(next?.bvid).not.toBe('a');
  });
});

describe('pickPrev', () => {
  it('sequential: a → c (wrap)', () => {
    expect(pickPrev(src, 'a', 'sequential')?.bvid).toBe('c');
    expect(pickPrev(src, 'b', 'sequential')?.bvid).toBe('a');
  });
});
```

跑测试：
```bash
npm test
```

Expected: 全过（包括之前的 11 个 + 这里 4 个 = 15 个）。

- [ ] **Step 3: ProgressBar 组件（read-only，本地定时器）**

```tsx
// src/renderer/components/ProgressBar.tsx
import { useEffect, useState } from 'react';

type Props = { bvid: string | null; duration: number };

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ProgressBar({ bvid, duration }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    if (!bvid) return;
    const t0 = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.min(duration, (Date.now() - t0) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [bvid, duration]);

  const pct = duration > 0 ? (elapsed / duration) * 100 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums', minWidth: 36 }}>
        {formatTime(elapsed)}
      </span>
      <div style={{
        flex: 1, height: 4,
        background: 'rgba(255,255,255,0.2)',
        borderRadius: 2, position: 'relative',
      }}>
        <div style={{
          height: '100%', background: '#5cb6ff',
          borderRadius: 2, width: `${pct}%`,
          transition: 'width 0.3s linear',
        }} />
      </div>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>
        {formatTime(duration)}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: SourceMenu 组件**

```tsx
// src/renderer/components/SourceMenu.tsx
import { useState } from 'react';
import { useStore } from '../state';
import { api } from '../api';

type Props = { onClose: () => void };

export function SourceMenu({ onClose }: Props) {
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const sources = useStore(s => s.config.sources);
  const currentSourceId = useStore(s => s.config.currentSourceId);
  const setConfig = useStore(s => s.setConfig);

  const onPick = async (sourceId: string) => {
    const src = sources.find(s => s.id === sourceId);
    if (!src || src.videos.length === 0) return;
    const cfg = await api.setCurrent({ sourceId, bvid: src.videos[0].bvid });
    setConfig(cfg);
    onClose();
  };

  const onAdd = async () => {
    setError(null);
    try {
      const cfg = await api.addSource({ url: url.trim() });
      setConfig(cfg);
      setUrl('');
      setAdding(false);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: 70, right: 8,
        background: 'rgba(28,28,38,0.96)',
        backdropFilter: 'blur(20px)',
        borderRadius: 10,
        padding: 6,
        minWidth: 240,
        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 20,
      }}
    >
      <div style={{
        fontSize: 10, color: 'rgba(255,255,255,0.4)',
        padding: '4px 10px 6px', textTransform: 'uppercase',
        letterSpacing: 0.5, fontWeight: 600,
      }}>合集</div>
      {sources.map(s => (
        <div
          key={s.id}
          onClick={() => onPick(s.id)}
          style={{
            padding: '7px 10px', fontSize: 13,
            color: 'rgba(255,255,255,0.9)',
            cursor: 'pointer', borderRadius: 5,
            display: 'flex', alignItems: 'center', gap: 8,
            background: s.id === currentSourceId ? 'rgba(92,182,255,0.15)' : 'transparent',
          }}
        >
          {s.id === currentSourceId ? '✓ ' : '   '}{s.name} ({s.videos.length})
        </div>
      ))}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 4, paddingTop: 4 }}>
        {!adding ? (
          <div
            onClick={() => setAdding(true)}
            style={{ padding: '7px 10px', fontSize: 13, color: '#5cb6ff', cursor: 'pointer', borderRadius: 5 }}
          >+ 粘贴合集 URL 添加</div>
        ) : (
          <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="space.bilibili.com/.../lists/...?type=season"
              style={{
                width: '100%', padding: '5px 8px', fontSize: 11,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 4, color: '#fff', outline: 'none',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onAdd} style={{
                flex: 1, padding: '5px 0', fontSize: 11,
                background: '#5cb6ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
              }}>添加</button>
              <button onClick={() => { setAdding(false); setError(null); }} style={{
                padding: '5px 10px', fontSize: 11,
                background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
              }}>取消</button>
            </div>
            {error && <div style={{ fontSize: 10, color: '#ff7878' }}>{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: ControlBar 组件（汇总播放控制 + 进度 + 静音 + 源切换）**

```tsx
// src/renderer/components/ControlBar.tsx
import { useState } from 'react';
import { useStore } from '../state';
import { api } from '../api';
import { ProgressBar } from './ProgressBar';
import { SourceMenu } from './SourceMenu';
import { pickNext, pickPrev } from '../playback';
import type { PlayMode } from '../shared/types';

const MODE_ICON: Record<PlayMode, string> = {
  sequential: '➡️',
  shuffle: '🔀',
  loop: '🔂',
};

const MODE_NEXT: Record<PlayMode, PlayMode> = {
  sequential: 'shuffle',
  shuffle: 'loop',
  loop: 'sequential',
};

export function ControlBar() {
  const [showSource, setShowSource] = useState(false);
  const config = useStore(s => s.config);
  const setConfig = useStore(s => s.setConfig);

  const currentSource = config.sources.find(s => s.id === config.currentSourceId);
  const currentVideo = currentSource?.videos.find(v => v.bvid === config.currentBvid);
  const duration = currentVideo?.duration ?? 0;

  const playNext = async () => {
    if (!currentSource) return;
    const v = pickNext(currentSource, config.currentBvid, config.playMode);
    if (v) {
      const cfg = await api.setCurrent({ sourceId: currentSource.id, bvid: v.bvid });
      setConfig(cfg);
    }
  };

  const playPrev = async () => {
    if (!currentSource) return;
    const v = pickPrev(currentSource, config.currentBvid, config.playMode);
    if (v) {
      const cfg = await api.setCurrent({ sourceId: currentSource.id, bvid: v.bvid });
      setConfig(cfg);
    }
  };

  const cycleMode = async () => {
    const cfg = await api.setPlayMode({ mode: MODE_NEXT[config.playMode] });
    setConfig(cfg);
  };

  const toggleMute = async () => {
    const cfg = await api.setMuted({ muted: !config.muted });
    setConfig(cfg);
  };

  const btnStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.9)',
    fontSize: 16, cursor: 'pointer', padding: '4px 7px', borderRadius: 5,
    lineHeight: 1,
  };

  return (
    <div
      onClick={() => setShowSource(false)}
      style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 40%)',
        padding: '8px 12px 10px',
        zIndex: 5,
      }}
    >
      <ProgressBar bvid={config.currentBvid} duration={duration} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <button style={btnStyle} onClick={playPrev} title="上一首">⏮</button>
        <button style={btnStyle} onClick={playNext} title="下一首">⏭</button>
        <button style={btnStyle} onClick={cycleMode} title={`播放模式：${config.playMode}`}>
          {MODE_ICON[config.playMode]}
        </button>
        <div style={{ flex: 1 }} />
        <button style={btnStyle} onClick={toggleMute} title={config.muted ? '取消静音' : '静音'}>
          {config.muted ? '🔇' : '🔊'}
        </button>
        <button
          style={btnStyle}
          onClick={(e) => { e.stopPropagation(); setShowSource(v => !v); }}
          title="切换合集"
        >📂</button>
      </div>
      {showSource && <SourceMenu onClose={() => setShowSource(false)} />}
    </div>
  );
}
```

- [ ] **Step 6: 把 ControlBar 接到 ExpandedPlayer**

```tsx
// src/renderer/components/ExpandedPlayer.tsx
import { useState } from 'react';
import { useStore } from '../state';
import { BilibiliFrame } from './BilibiliFrame';
import { TitleBar } from './TitleBar';
import { ResizeHandle } from './ResizeHandle';
import { EmptyState } from './EmptyState';
import { ControlBar } from './ControlBar';

export function ExpandedPlayer() {
  const [hover, setHover] = useState(false);
  const sources = useStore(s => s.config.sources);
  const currentBvid = useStore(s => s.config.currentBvid);

  const isEmpty = sources.length === 0;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', height: '100%',
        borderRadius: 16,
        background: '#0a0a14',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {currentBvid && <BilibiliFrame bvid={currentBvid} />}
          <div style={{
            opacity: hover ? 1 : 0,
            transition: 'opacity 0.25s',
            pointerEvents: hover ? 'auto' : 'none',
          }}>
            <TitleBar />
            <ControlBar />
          </div>
          <ResizeHandle />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 7: 跑 dev 验证**

```bash
npm run dev
```

Expected:
- 添加合集后 hover 看到控件条
- ⏮ ⏭ 切歌（视频窗换内容）
- 切换播放模式图标会变（➡️ → 🔀 → 🔂 → ➡️）
- 点 🔊 / 🔇 静音切换（B 站视频声音真的会断/恢复）
- 点 📂 弹出合集列表

按 Ctrl+C 退出。

- [ ] **Step 8: Commit**

```bash
git add src/renderer/playback.ts src/renderer/playback.test.ts
git add src/renderer/components/ProgressBar.tsx
git add src/renderer/components/SourceMenu.tsx
git add src/renderer/components/ControlBar.tsx
git add src/renderer/components/ExpandedPlayer.tsx
git commit -m "feat: control bar with progress, mute, mode cycle, source menu"
```

---

## Task 11: 右键上下文菜单

**Files:**
- Create: `src/renderer/components/ContextMenu.tsx`
- Modify: `src/renderer/components/FoldedPet.tsx`
- Modify: `src/renderer/components/ExpandedPlayer.tsx`

- [ ] **Step 1: 创建 ContextMenu**

```tsx
// src/renderer/components/ContextMenu.tsx
import { useEffect, useRef } from 'react';
import { useStore } from '../state';
import { api } from '../api';
import { pickNext } from '../playback';
import type { PlayMode } from '../shared/types';

type Props = { x: number; y: number; onClose: () => void };

const MODE_LABEL: Record<PlayMode, string> = {
  sequential: '顺序播放',
  shuffle: '随机播放',
  loop: '单曲循环',
};

export function ContextMenu({ x, y, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const config = useStore(s => s.config);
  const setConfig = useStore(s => s.setConfig);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  const pickSource = async (id: string) => {
    const src = config.sources.find(s => s.id === id);
    if (!src || src.videos.length === 0) return;
    const cfg = await api.setCurrent({ sourceId: id, bvid: src.videos[0].bvid });
    setConfig(cfg);
    onClose();
  };

  const setMode = async (mode: PlayMode) => {
    const cfg = await api.setPlayMode({ mode });
    setConfig(cfg);
    onClose();
  };

  const skip = async () => {
    const src = config.sources.find(s => s.id === config.currentSourceId);
    if (!src) return;
    const v = pickNext(src, config.currentBvid, config.playMode);
    if (v) {
      const cfg = await api.setCurrent({ sourceId: src.id, bvid: v.bvid });
      setConfig(cfg);
    }
    onClose();
  };

  const itemStyle: React.CSSProperties = {
    padding: '7px 10px', fontSize: 13,
    color: 'rgba(255,255,255,0.9)', cursor: 'pointer',
    borderRadius: 5,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, color: 'rgba(255,255,255,0.4)',
    padding: '4px 10px 6px', textTransform: 'uppercase',
    letterSpacing: 0.5, fontWeight: 600,
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: x, top: y,
        background: 'rgba(28,28,38,0.96)',
        backdropFilter: 'blur(20px)',
        borderRadius: 10, padding: 6, minWidth: 200,
        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 1000,
      }}
    >
      {config.sources.length > 0 && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 4 }}>
          <div style={labelStyle}>合集</div>
          {config.sources.map(s => (
            <div
              key={s.id}
              style={{ ...itemStyle, background: s.id === config.currentSourceId ? 'rgba(92,182,255,0.15)' : 'transparent' }}
              onClick={() => pickSource(s.id)}
            >
              {s.id === config.currentSourceId ? '✓ ' : '   '}{s.name}
            </div>
          ))}
        </div>
      )}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '4px 0' }}>
        <div style={labelStyle}>播放模式</div>
        {(['sequential', 'shuffle', 'loop'] as PlayMode[]).map(m => (
          <div
            key={m}
            style={{ ...itemStyle, background: m === config.playMode ? 'rgba(92,182,255,0.15)' : 'transparent' }}
            onClick={() => setMode(m)}
          >
            {m === config.playMode ? '✓ ' : '   '}{MODE_LABEL[m]}
          </div>
        ))}
      </div>
      <div style={{ padding: '4px 0' }}>
        {config.currentBvid && (
          <div style={itemStyle} onClick={skip}>⏭ 下一首</div>
        )}
        <div style={{ ...itemStyle, color: '#ff7878' }} onClick={() => api.quit()}>退出</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 在 FoldedPet 上接入右键**

```tsx
// src/renderer/components/FoldedPet.tsx
// （把现有文件改成下面，主要变化：加 useState 管 contextMenu 状态、onContextMenu 改成显示菜单）
import { useRef, useState } from 'react';
import { useStore } from '../state';
import { api } from '../api';
import { ContextMenu } from './ContextMenu';

export function FoldedPet() {
  const emoji = useStore(s => s.config.petEmoji);
  const hasSource = useStore(s => s.config.sources.length > 0);
  const setConfig = useStore(s => s.setConfig);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const dragState = useRef({ down: false, didDrag: false, startX: 0, startY: 0, startScreenX: 0, startScreenY: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragState.current = {
      down: true,
      didDrag: false,
      startX: e.screenX,
      startY: e.screenY,
      startScreenX: window.screenX,
      startScreenY: window.screenY,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const s = dragState.current;
    if (!s.down) return;
    const dx = e.screenX - s.startX;
    const dy = e.screenY - s.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) s.didDrag = true;
    if (s.didDrag) {
      api.updateWindowGeometry({ petPos: { x: s.startScreenX + dx, y: s.startScreenY + dy } });
    }
  };

  const onMouseUp = async () => {
    const s = dragState.current;
    s.down = false;
    if (s.didDrag) return;
    const cfg = useStore.getState().config;
    setConfig({ ...cfg, windowState: { ...cfg.windowState, mode: 'expanded' } });
    await api.setWindowMode({ mode: 'expanded' });
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onContextMenu={onContextMenu}
        style={{
          width: 80, height: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 56, cursor: 'grab', userSelect: 'none',
          position: 'relative',
          filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.55))',
          animation: 'bob 4s ease-in-out infinite',
        }}
      >
        {emoji}
        {hasSource && (
          <span style={{
            position: 'absolute', top: 12, right: 12,
            width: 10, height: 10, borderRadius: '50%',
            background: '#ff5a5a',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.4), 0 0 12px rgba(255,90,90,0.8)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        )}
        <style>{`
          @keyframes bob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} />}
    </>
  );
}
```

- [ ] **Step 3: 在 ExpandedPlayer 上也接入右键（视频区右键也弹菜单）**

```tsx
// src/renderer/components/ExpandedPlayer.tsx
import { useState } from 'react';
import { useStore } from '../state';
import { BilibiliFrame } from './BilibiliFrame';
import { TitleBar } from './TitleBar';
import { ResizeHandle } from './ResizeHandle';
import { EmptyState } from './EmptyState';
import { ControlBar } from './ControlBar';
import { ContextMenu } from './ContextMenu';

export function ExpandedPlayer() {
  const [hover, setHover] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const sources = useStore(s => s.config.sources);
  const currentBvid = useStore(s => s.config.currentBvid);

  const isEmpty = sources.length === 0;

  return (
    <>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onContextMenu={(e) => {
          // iframe 区域的右键会被 iframe 吃掉，只有 hover 控件层时这里能捕获
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        style={{
          width: '100%', height: '100%',
          borderRadius: 16,
          background: '#0a0a14',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {currentBvid && <BilibiliFrame bvid={currentBvid} />}
            <div style={{
              opacity: hover ? 1 : 0,
              transition: 'opacity 0.25s',
              pointerEvents: hover ? 'auto' : 'none',
            }}>
              <TitleBar />
              <ControlBar />
            </div>
            <ResizeHandle />
          </>
        )}
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} />}
    </>
  );
}
```

- [ ] **Step 4: 跑 dev 验证**

```bash
npm run dev
```

Expected:
- 折叠态 🪩 上右键 → 弹出菜单（合集、播放模式、下一首、退出）
- 点合集 → 切到那个合集
- 点播放模式 → 切换并 ✓ 标记移动
- 点退出 → 应用退出

按 Ctrl+C（如果还在）退出。

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/ContextMenu.tsx
git add src/renderer/components/FoldedPet.tsx
git add src/renderer/components/ExpandedPlayer.tsx
git commit -m "feat: right-click context menu for source/mode/skip/exit"
```

---

## Task 12: 自动切歌（duration 定时器）

**Files:**
- Create: `src/renderer/auto-advance.ts`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: 创建 auto-advance hook**

```ts
// src/renderer/auto-advance.ts
import { useEffect } from 'react';
import { useStore } from './state';
import { api } from './api';
import { pickNext } from './playback';

/**
 * 监听当前播放视频的 duration，到点自动切下一首。
 * iframe 跨域拿不到真实结束事件，用本地定时器估算。
 */
export function useAutoAdvance() {
  const config = useStore(s => s.config);
  const setConfig = useStore(s => s.setConfig);
  const currentBvid = config.currentBvid;
  const currentSource = config.sources.find(s => s.id === config.currentSourceId);
  const currentVideo = currentSource?.videos.find(v => v.bvid === currentBvid);
  const duration = currentVideo?.duration ?? 0;

  useEffect(() => {
    if (!currentBvid || !currentSource || duration <= 0) return;

    // duration 是秒，加 2s buffer 防止过早切
    const ms = (duration + 2) * 1000;
    const id = setTimeout(async () => {
      const v = pickNext(currentSource, currentBvid, config.playMode);
      if (v) {
        const cfg = await api.setCurrent({ sourceId: currentSource.id, bvid: v.bvid });
        setConfig(cfg);
      }
    }, ms);

    return () => clearTimeout(id);
  }, [currentBvid, currentSource, duration, config.playMode, setConfig]);
}
```

- [ ] **Step 2: 在 App.tsx 调用**

```tsx
// src/renderer/App.tsx
import { useEffect } from 'react';
import { useStore } from './state';
import { FoldedPet } from './components/FoldedPet';
import { ExpandedPlayer } from './components/ExpandedPlayer';
import { useAutoAdvance } from './auto-advance';

export default function App() {
  const ready = useStore(s => s.ready);
  const hydrate = useStore(s => s.hydrate);
  const mode = useStore(s => s.config.windowState.mode);

  useEffect(() => { hydrate(); }, [hydrate]);
  useAutoAdvance();

  if (!ready) return null;

  return mode === 'folded' ? <FoldedPet /> : <ExpandedPlayer />;
}
```

- [ ] **Step 3: 验证（手动 —— 用一首 1 分钟以下的视频测）**

```bash
npm run dev
```

挑一个 duration < 60s 的合集（或在 store.ts 里临时把 duration 改成 5 测一遍），看 ⏭ 自动切到下一首。

按 Ctrl+C 退出。

- [ ] **Step 4: Commit**

```bash
git add src/renderer/auto-advance.ts src/renderer/App.tsx
git commit -m "feat: auto-advance to next track when video duration elapses"
```

---

## Task 13: 打包成 .app + 完整冒烟测试

**Files:**
- Create: `resources/icon.png`（占位）
- Modify: `package.json`（已有 build 配置，可能补充）

- [ ] **Step 1: 放一个临时 app 图标**

```bash
mkdir -p resources
# 用任意 512×512 PNG 占位；这里用 macOS 自带 iconutil 也行
# 简单起见：写一个纯色 PNG 当占位
python3 -c "
import struct, zlib
def png(w, h, color):
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    ihdr_chunk = b'IHDR' + ihdr
    ihdr_crc = struct.pack('>I', zlib.crc32(ihdr_chunk))
    raw = b''
    for _ in range(h):
        raw += b'\x00' + (color * w)
    idat = zlib.compress(raw)
    idat_chunk = b'IDAT' + idat
    idat_crc = struct.pack('>I', zlib.crc32(idat_chunk))
    iend_chunk = b'IEND'
    iend_crc = struct.pack('>I', zlib.crc32(iend_chunk))
    return sig + struct.pack('>I', 13) + ihdr_chunk + ihdr_crc + struct.pack('>I', len(idat)) + idat_chunk + idat_crc + struct.pack('>I', 0) + iend_chunk + iend_crc

with open('resources/icon.png', 'wb') as f:
    f.write(png(512, 512, b'\x6b\x4a\xa8'))
print('wrote resources/icon.png')
"
```

Expected: `resources/icon.png` 创建。

- [ ] **Step 2: package.json 加图标引用**

把 `package.json` 的 `build.mac` 改成：
```json
"mac": {
  "category": "public.app-category.music",
  "icon": "resources/icon.png"
}
```

- [ ] **Step 3: 跑 build 验证打包**

```bash
npm run package
```

Expected: `dist/` 下出现 `Broadcast-0.1.0.dmg` 或 `mac/Broadcast.app`（电子构建器输出）。如果遇到 code signing 报错，可忽略（开发阶段未签名 OK，需要双击右键打开）。

- [ ] **Step 4: 手动跑 .app 跑完整冒烟流程**

```bash
open "dist/mac-arm64/Broadcast.app" || open "dist/mac/Broadcast.app"
```

按 spec 第 9 节成功标准逐条验证：

1. [ ] 启动，🪩 出现在屏幕中心
2. [ ] 首次启动单击 🪩 → 展开为空状态卡片
3. [ ] 粘 `https://space.bilibili.com/55491826/lists/3300721?type=season` → 合集加入，自动切到第一首播放
4. [ ] hover 视频窗 → 看到控件，⏭ 切歌正常
5. [ ] 右键 🪩 → 「+ 添加合集」入口（注：v1 在 +菜单和 SourceMenu 都有，至少一个能加）
6. [ ] 再加一个合集 `https://space.bilibili.com/3690985372519123/lists/6971509?type=season`，右键切换合集 → 视频窗换内容
7. [ ] 「−」收起回 🪩
8. [ ] 退出应用，重启 → 窗口位置、当前合集、播放模式都恢复

每项 ✓ 之后画勾。

- [ ] **Step 5: Commit**

```bash
git add resources/icon.png package.json
git commit -m "feat: package as macOS .app with placeholder icon"
```

---

## Task 14: 收尾 & README

**Files:**
- Create: `README.md`

- [ ] **Step 1: 写一个简短 README**

```markdown
# Broadcast

A macOS desktop BGM pet that plays Bilibili 合集 videos in a tiny floating window.

## Dev

```bash
npm install
npm run dev      # start app in dev mode
npm test         # run unit tests
npm run package  # build .app
```

## How it works

- Folded state: a transparent 80x80 emoji (🪩 default) on your desktop, always-on-top
- Click to expand into a 360x240 mini Bilibili player
- Right-click for the menu: switch source, change play mode, skip, quit
- Paste a B 站 UP 主 合集 URL (`https://space.bilibili.com/{mid}/lists/{seasonId}?type=season`) to add a source

## Spec

See `docs/superpowers/specs/2026-05-25-desktop-bgm-pet-design.md`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## 自检 - Self-Review

实现完成后，对照 spec 第 9 节成功标准逐条手测：

1. 双击 .app → 🪩 在屏幕中心
2. 首次启动单击 🪩 → 空状态卡片
3. 已有合集时单击 🪩 → 视频窗自动播放
4. hover 视频窗 → 控件，⏭ 切歌正常
5. 右键 🪩 → 「添加合集」入口（在 SourceMenu 的「+ 粘贴合集 URL 添加」可达）
6. 切换合集 → 视频窗换内容
7. 「−」收起回 🪩
8. 重启 → 窗口位置、当前合集、播放模式恢复

任何一项不过，回到对应 task 修。
