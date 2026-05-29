# Broadcast — Desktop BGM Pet

桌面 BGM 宠物 —— 一个常驻 macOS 桌面的迷你 B 站播放器。

折叠时桌面上是个 🪩 小图标；点一下展开成视频小窗，开始放 B 站 UP 主合集 / 视频列表里的 BGM。

> 仓库叫 `desktop-bgm-pet`,打包产物叫 `Broadcast.app`。

## 下载

直接下载已打包好的 macOS .app:[Releases](https://github.com/cabiriawzy-hub/desktop-bgm-pet/releases)

首次双击会被 Gatekeeper 拦（unsigned），右键 → 打开 → 继续即可，或：
```bash
xattr -d com.apple.quarantine "/Applications/Broadcast.app"
```

## 自己跑 / 自己打包

```bash
npm install
npm run dev       # 跑开发模式
npm test          # 跑单元测试
npm run package   # 打包成 .app
```

打包产物在 `dist/mac-arm64/Broadcast.app`（M 系列 Mac）。

## 用法

1. 启动 → 🪩 出现在屏幕中心
2. 单击 🪩 → 展开播放器，第一次会让你粘 B 站合集 / 视频列表 URL
3. 支持的 URL 格式：
   - 合集：`https://space.bilibili.com/{mid}/lists/{seasonId}?type=season`
   - 视频列表：`https://space.bilibili.com/{mid}/lists/{seriesId}?type=series`
   - 分P 视频：`https://www.bilibili.com/video/{bvid}` (每个分P 作为一首)
   - 不支持个人收藏夹（type=collect）

   想直接试一下，可以粘这两个：
   - 纯音乐合集（251 首）：`https://space.bilibili.com/3690985372519123/lists/6971509?type=season`
   - 白噪音视频列表（30 首）：`https://space.bilibili.com/95262312/lists/1577680?type=series`
4. hover 播放器 → 显示控件（⏮ ⏭ 🔀 🔇 📂）
5. 右键 🪩 或播放器边缘 → 弹出菜单（切合集、播放模式、视频透明度、下一首、退出）
6. 点「−」收起回 🪩
7. 拖动 🪩 或播放器顶部标题栏移动位置；拖右下角改播放器大小
8. 重启会恢复上次位置、当前合集、播放模式

## 已知限制

- 只支持 macOS（Apple Silicon）
- B 站播放器是游客模式，画质和音质受限于未登录
- 没有进度条拖动（webview 内 seek 需要重载 → 体验差）
- 自动切歌靠本地 duration 定时器估算，可能有几秒误差
- 静音 (🔇) 只是消音，视频还在跑，到点照常切下一首
- 添加重复 URL 不会去重
- 不支持「UP 主投稿」URL(即裸 `space.bilibili.com/{mid}` 形式)。B 站对这条 API 加了多层反爬(wbi 签名 + buvid3 + 多种指纹参数),稳定不下来,本项目暂不维护;请用 UP 主的「合集」(`lists/{id}?type=season`)或「视频列表」(`lists/{id}?type=series`)替代

## 架构

- Electron 单窗口（透明、无边框、永远置顶）
- 折叠态 80×80，展开态默认 360×240（可拖到 240–900 宽）
- 主进程：窗口管理、B 站 API（带浏览器 headers）、electron-store 持久化、IPC
- 渲染进程：React + Zustand
- B 站合集 / 视频列表数据通过 `seasons_archives_list` / `series_archives` 公开接口拉取
- 视频通过 `<webview>` 嵌入官方 player.bilibili.com，注入 CSS + 轻量 JS 隐藏 B 站自带 UI

## License

MIT — 见 [LICENSE](LICENSE)。
