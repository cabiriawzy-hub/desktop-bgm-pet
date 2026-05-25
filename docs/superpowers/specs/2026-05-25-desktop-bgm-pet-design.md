# 桌面 BGM 宠物 - 设计文档

**项目代号：** broadcast
**日期：** 2026-05-25
**目标平台：** macOS（首版只做 Mac）

## 1. 目标

一个常驻 macOS 桌面的迷你 BGM 播放器，从 B 站 UP 主的「合集」拉取视频列表，随时切换播放。

定位是「能干活的桌面装饰」—— 既要可爱、有存在感，又不能打扰工作。

## 2. 用户故事

- **U1**：我在工作时想听 BGM，单击桌面上一个小图标，立刻弹出一个迷你视频窗放音乐
- **U2**：听腻了当前合集，右键图标，菜单里选另一个合集，立刻换内容
- **U3**：看到 B 站上新的合集 URL，复制粘贴进来就能加入我的库
- **U4**：不听的时候点一下窗口角落的「−」，缩回小图标，桌面不被占
- **U5**：图标可以拖到屏幕任意位置；播放器可以拖动、可以调大小；下次启动恢复

## 3. 形态与交互

### 3.1 两态

**折叠态（默认 80×80）**
- **窗口背景全透明**，桌面上只看到 emoji 本身，emoji 加 `drop-shadow` 营造立体感
- 中间是一个 emoji（默认 🪩，字号 56px，用户可在设置里改）
- 80×80 是不可见的点击/拖拽热区（包住 emoji），交互目标比纯 emoji 大一圈
- 右上角小红点表示「正在播放」（贴在 emoji 右上角，pulse 闪烁）
- 永远置顶
- 单击 → 展开成播放器
- 右键 → 上下文菜单（合集切换、播放模式、播放控制、设置、退出）
- 拖拽 → 移动位置

**展开态（默认 360×240，可拖拽 240×160 ~ 900×600）**
- 矩形、圆角、轻微阴影、永远置顶
- 视频区铺满整个窗口（B 站 iframe 播放器）
- 控件浮层默认隐藏，鼠标 hover 才显示，离开 0.25s 淡出
- 顶部：标题栏（显示当前歌名 + 收起按钮「−」）
- 底部：进度条 + 时间 + 按钮行（⏮ ⏭ 🔀 🔇 📂）+ 总时长
- **没有 ⏯ 播放/暂停按钮**：iframe 跨域不让控制，只能重载 iframe 模拟，3-5s 黑屏比没按钮更糟。要静音用 🔇，要换内容用 ⏭
- 右下角拖拽柄可改窗口大小
- 标题栏区域可拖拽移动整个窗口；视频区点击交给 iframe 自己处理

**展开态的空状态（还没添加任何合集）**
- 视频区位置改为空状态卡片：图标 + 「粘贴一个 B 站合集 URL 来开始」+ 输入框 + 「添加」按钮
- 底部控件条隐藏
- 第一次添加成功后切换到正常播放态

### 3.2 两态切换

- 折叠 → 展开：以宠物中心点为锚，展开播放器到 360×240（或上次记忆的尺寸）。展开后 2s 内控件全亮，让用户看到一眼，然后淡出。
- 展开 → 折叠：点收起按钮「−」。以播放器中心点为锚，缩回 80×80 宠物。
- 切换时禁用 macOS 默认窗口动画（`setBounds` 直接改），避免抖动。

### 3.3 控件细节

**进度条**
- 4px 高细线，hover 变 6px，显示当前播放进度
- **v1 只读，不支持点击/拖动跳转**：B 站 iframe 跨域不让我们 seek，唯一的办法是改 iframe `src` 带 `t=` 参数重载，每次跳转会有 3-5s 黑屏，体验比没 seek 还差。需要跳过当前歌直接用 ⏭
- 进度由本地定时器估算（已知 video 总时长，从播放开始计时）

**静音**
- 控件条上一个 🔇 / 🔊 切换按钮（不是滑条）
- 实现走 `webContents.setAudioMuted`，整窗静音/取消
- 音量大小走 Mac 系统音量键，应用内不重复造轮子
- 选择原因：iframe 跨域导致没法做连续音量控制；与其放一个假滑条骗用户，不如做诚实的二态切换

**播放模式**
- 顺序 / 随机 / 单曲循环
- ⏭ 按当前模式决定下一首
- 视频自然结束的检测：用 duration 起定时器，到点切下一首；用户手动 ⏭ 重置定时器

**源切换**
- 📂 按钮点开浮层，列出所有已添加合集（名称 + 视频数）
- 浮层底部「+ 粘贴合集 URL 添加」按钮
- 添加后立刻切到该合集第一首

## 4. B 站集成

### 4.1 URL 解析

支持的 URL 格式：
```
https://space.bilibili.com/{mid}/lists/{season_id}?type=season
```

正则：`/space\.bilibili\.com\/(\d+)\/lists\/(\d+)/`，要求 query 包含 `type=season`。

不支持的 URL（个人收藏夹 `type=collect`、UP 视频列表 `type=series`）给出明确错误：「目前只支持 UP 主的『合集』，你贴的是 XX，请到 B 站打开合集页再复制 URL」。

### 4.2 拉取视频列表

```
GET https://api.bilibili.com/x/polymer/web-space/seasons_archives_list
  ?mid={mid}&season_id={season_id}&page_num={n}&page_size=30
```

**Headers 必填**（缺一会被风控 -352）：
```
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
Referer: https://space.bilibili.com/{mid}/lists/{season_id}?type=season
Origin: https://space.bilibili.com
```

由 Electron 主进程发请求（`net.fetch`），避免渲染进程的 CORS 限制。

**响应结构**（关心的字段）：
```json
{
  "code": 0,
  "data": {
    "meta": { "name": "合集名", "total": 40, "mid": 55491826 },
    "archives": [
      { "bvid": "BV1xw4m1a76E", "title": "...", "duration": 5881, "pic": "https://..." }
    ]
  }
}
```

分页拉直到 `archives.length < page_size` 或累计 >= `meta.total`。

### 4.3 缓存策略

- 添加合集时同步拉一次，存到 `electron-store`
- 启动时直接用缓存渲染 UI
- 启动后异步刷新所有合集（背景请求，差异更新本地缓存）
- 用户手动「刷新」可强制重拉

### 4.4 播放

iframe 嵌入：
```html
<iframe
  src="//player.bilibili.com/player.html?bvid={bvid}&autoplay=1&danmaku=0&hideCoverInfo=1"
  allow="autoplay; fullscreen"
  frameborder="0"
/>
```

- `danmaku=0`：弹幕默认关
- `hideCoverInfo=1`：隐藏标题/UP 信息浮层（让视频区更干净）
- 切歌：直接修改 iframe 的 `src`
- 画质：游客模式，由 B 站自动决定（首版接受，不做 cookie 注入）

## 5. 数据模型与存储

用 `electron-store`，路径：
```
~/Library/Application Support/broadcast/config.json
```

```ts
type Config = {
  sources: Source[];
  currentSourceId: string | null;
  currentBvid: string | null;
  playMode: 'sequential' | 'shuffle' | 'loop';
  muted: boolean;
  petEmoji: string;        // 默认 '🪩'
  windowState: {
    mode: 'folded' | 'expanded';
    petPos: { x: number; y: number };
    playerPos: { x: number; y: number };
    playerSize: { w: number; h: number };
  };
};

type Source = {
  id: string;              // uuid
  name: string;            // 合集名（从 meta.name）
  mid: string;
  seasonId: string;
  videos: Video[];
  lastFetched: number;     // unix ts
};

type Video = {
  bvid: string;
  title: string;
  cover: string;           // pic URL
  duration: number;        // 秒
};
```

## 6. 技术栈与项目结构

**栈：** Electron + TypeScript + React + Vite（`electron-vite` 脚手架）+ Zustand（渲染端状态）+ electron-store（持久化）

```
broadcast/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── src/
│   ├── main/                        # 主进程
│   │   ├── index.ts                 # app 生命周期、创建窗口
│   │   ├── window.ts                # BrowserWindow 配置、两态切换
│   │   ├── ipc.ts                   # IPC handler 注册
│   │   ├── bilibili.ts              # API 调用、URL 解析
│   │   └── store.ts                 # electron-store 封装
│   ├── preload/
│   │   └── index.ts                 # contextBridge 暴露 API
│   └── renderer/                    # React 应用（单 entry）
│       ├── main.tsx
│       ├── App.tsx                  # 根据 mode 渲染 Folded 或 Expanded
│       ├── state.ts                 # zustand store
│       ├── api.ts                   # 调用 window.api.* (preload 暴露的)
│       └── components/
│           ├── FoldedPet.tsx
│           ├── ExpandedPlayer.tsx
│           ├── BilibiliFrame.tsx
│           ├── ControlBar.tsx
│           ├── ProgressBar.tsx
│           ├── MuteButton.tsx
│           ├── SourceMenu.tsx
│           └── ContextMenu.tsx
└── resources/
    └── icon.png                     # Dock / 应用图标
```

## 7. 关键技术决策与对策

| 问题 | 决策 |
|---|---|
| iframe autoplay 阻断 | Electron `BrowserWindow.webPreferences.autoplayPolicy = 'no-user-gesture-required'` |
| B 站 API 风控 -352 | 主进程发请求时强制带完整浏览器 UA + Referer + Origin |
| iframe 跨域，拿不到播放事件 | 用 video duration 起定时器估算结束；不追求秒级精度 |
| 音量不能直接控制 iframe | v1 只做静音切换（`webContents.setAudioMuted`），音量大小由 Mac 系统音量键负责 |
| 窗口拖出屏外 | 启动时校验 `petPos` / `playerPos` 落在某个 `screen.getAllDisplays()` 范围内，否则归位到主屏中心 |
| 切换两态的窗口动画抖动 | `setBounds` 直接改，禁掉 macOS 默认 animate |
| dock 图标 | 首版保留 dock 图标（最简）；后续可选 `app.dock.hide()` + 菜单栏图标 |
| 开机自启 | 首版不做，预留 `app.setLoginItemSettings` |

## 8. 范围外（首版不做）

- Windows / Linux 支持
- B 站登录（cookie 注入提升画质）
- 个人收藏夹、UP 视频列表（只支持「合集」）
- 自定义宠物图片（只支持 emoji）
- 弹幕开关 UI（默认关、不暴露开关）
- 收藏到 B 站、定时关闭、菜单栏图标、开机自启
- 自己提取音频流（不绕过 iframe）

## 9. 成功标准

最小可用：

1. 双击 .app 启动，🪩 折叠态出现在屏幕中心（首次启动）或上次记忆的位置
2. 首次启动尚无合集时，单击 🪩 → 展开为空状态卡片「粘贴一个 B 站合集 URL 开始」，带输入框
3. 已有合集时，单击 🪩 → 展开为视频窗，自动播放当前合集（按播放模式决定哪首）
4. hover 视频窗 → 看到控件，⏭ 切歌正常工作
5. 右键 🪩 → 看到「添加合集」入口，粘贴文档第 4.1 节支持的 URL → 合集出现在菜单里
6. 切换合集 → 视频窗换内容
7. 「−」收起回 🪩
8. 退出后再启动 → 窗口位置、当前合集、播放模式都恢复

## 10. 后续扩展（v2+）

- 自定义宠物图片（拖图片到设置面板）
- 菜单栏图标 + dock 隐藏选项
- B 站 SESSDATA 注入（高画质/高音质）
- 个人收藏夹支持
- 多个宠物同屏（不同合集分别播）
- 跨平台（Windows）
