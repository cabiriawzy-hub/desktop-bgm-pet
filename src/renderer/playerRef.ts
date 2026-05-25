// src/renderer/playerRef.ts
// 模块级 ref，指向当前 iframe 里的 <video> 元素。
// BilibiliFrame onLoad 后 set；ControlBar/ProgressBar/auto-advance 读。
// webSecurity:false 后能直接拿到跨域 iframe 的 contentDocument。

let videoEl: HTMLVideoElement | null = null;

export const playerRef = {
  set: (v: HTMLVideoElement | null) => { videoEl = v; },
  get: () => videoEl,
  pause: () => { videoEl?.pause(); },
  play: () => { videoEl?.play().catch(() => { /* autoplay 偶尔被拒，忽略 */ }); },
  seek: (t: number) => { if (videoEl) videoEl.currentTime = t; },
  currentTime: () => videoEl?.currentTime ?? 0,
  isReady: () => videoEl !== null,
};
