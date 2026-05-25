// src/renderer/playerRef.ts
// 模块级 ref，指向当前 <webview> 元素。
// BilibiliFrame 在 webview 'dom-ready' 后 set；其它组件用它来调 executeJavaScript。
// executeJavaScript 是异步的（IPC 到 webview 的 webContents 再回来），
// 所以读 currentTime 也是 Promise<number>。

import type { WebviewTag } from 'electron';

let view: WebviewTag | null = null;

export const playerRef = {
  set: (v: WebviewTag | null) => { view = v; },
  get: () => view,
  isReady: () => view !== null,
  pause: () => view?.executeJavaScript('document.querySelector("video")?.pause()').catch(() => {}),
  play: () => view?.executeJavaScript('document.querySelector("video")?.play()').catch(() => {}),
  seek: (t: number) => view?.executeJavaScript(`(()=>{const v=document.querySelector("video");if(v)v.currentTime=${t}})()`).catch(() => {}),
  currentTime: async (): Promise<number> => {
    if (!view) return 0;
    try {
      const t = await view.executeJavaScript('document.querySelector("video")?.currentTime ?? 0');
      return typeof t === 'number' ? t : 0;
    } catch {
      return 0;
    }
  },
};
