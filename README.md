# Broadcast

桌面 BGM 宠物 —— 一个常驻 macOS 桌面的迷你 B 站合集播放器。

折叠时桌面上是个 🪩 小图标；点一下展开成 360×240 的视频小窗，开始放 B 站 UP 主合集里的 BGM。

## 开发

```bash
npm install
npm run dev       # 跑开发模式
npm test          # 跑单元测试
npm run package   # 打包成 .app
```

打包产物在 `dist/mac-arm64/Broadcast.app`（M 系列 Mac）。

首次双击 .app 会被 Gatekeeper 拦（unsigned dev build），右键 → 打开 → 继续即可，或：
```bash
xattr -d com.apple.quarantine "dist/mac-arm64/Broadcast.app"
```

## 用法

1. 启动 → 🪩 出现在屏幕中心
2. 单击 🪩 → 展开播放器，第一次会让你粘 B 站合集 URL
3. URL 格式：`https://space.bilibili.com/{mid}/lists/{seasonId}?type=season`
   - 只支持 UP 主的「合集」，不支持个人收藏夹（type=collect）和视频列表（type=series）
4. hover 播放器 → 显示控件（⏮ ⏭ 🔀 🔇 📂）
5. 右键 🪩 或播放器边缘 → 弹出菜单（切合集、播放模式、下一首、退出）
6. 点「−」收起回 🪩
7. 拖动 🪩 或播放器顶部标题栏移动位置；拖右下角改播放器大小
8. 重启会恢复上次位置、当前合集、播放模式

## 已知限制（v1）

- 只支持 macOS
- B 站 iframe 是游客模式，画质和音质受限于未登录
- 没有进度条拖动（iframe 跨域，seek 需要重载 → 体验差）
- 没有真正的播放/暂停按钮（同上原因），只能静音
- 自动切歌靠本地 duration 定时器估算，可能有几秒误差
- 静音 (🔇) 只是消音，视频还在跑，到点照常切下一首
- 添加重复 URL 不会去重

## 架构

- Electron 单窗口（透明、无边框、永远置顶）
- 折叠态 80×80，展开态默认 360×240（可拖到 240–900 宽）
- 主进程：窗口管理、B 站 API（带浏览器 headers）、electron-store 持久化、IPC
- 渲染进程：React + Zustand
- B 站合集数据通过 `seasons_archives_list` 公开接口拉取
- 视频通过官方 iframe 播放器嵌入

完整设计：`docs/superpowers/specs/2026-05-25-desktop-bgm-pet-design.md`
实现计划：`docs/superpowers/plans/2026-05-25-desktop-bgm-pet.md`
