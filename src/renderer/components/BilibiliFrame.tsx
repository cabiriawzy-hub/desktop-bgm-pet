// src/renderer/components/BilibiliFrame.tsx
import { useEffect, useRef } from 'react';
import { playerRef } from '../playerRef';

type Props = { bvid: string; epoch: number };

// 隐藏 B 站自带 player chrome：顶部 logo/标题、UP 信息、"进入哔哩哔哩"、
// 它自己的播放控件、loading、toast、各种弹出物。
// B 站用 bplayer 框架（前缀 bpx-），加上一些通配兜底。
const HIDE_CHROME_CSS = `
  .bpx-player-control-wrap,
  .bpx-player-top-wrap,
  .bpx-player-toast-wrap,
  .bpx-player-state-wrap,
  .bpx-player-mask-wrap,
  .bpx-player-loading-wrap,
  .bpx-player-progress-wrap,
  .bpx-player-ending-related,
  .bpx-player-ending-wrap,
  .bpx-player-error-wrap,
  .bpx-player-sending-bar,
  .bpx-player-dialog-wrap,
  .bili-mini-mask,
  .bilibili-player-link,
  .bilibili-player-video-toast,
  .bilibili-player-video-popup,
  [class*="link-bilibili"],
  [class*="watch-bilibili"],
  [class*="end-mask"],
  [class*="popover"],
  [class*="popup"],
  [class*="lottery"],
  [class*="bili-card"],
  [class*="recommendation"],
  [class*="-cta-"] {
    display: none !important;
  }
  video {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
    background: #000 !important;
  }
`;

export function BilibiliFrame({ bvid, epoch }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const src = `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=1&danmaku=0&hideCoverInfo=1`;

  const onLoad = () => {
    const iframe = ref.current;
    if (!iframe) return;

    // 跨域访问可能抛 SecurityError，try/catch 一下方便排查
    let doc: Document | null = null;
    try {
      doc = iframe.contentDocument;
    } catch (err) {
      console.error('[BilibiliFrame] 访问 contentDocument 抛错（跨域被拦）:', err);
      return;
    }

    if (!doc) {
      console.error('[BilibiliFrame] contentDocument is null —— Site Isolation 没关掉或 webSecurity 没生效');
      return;
    }

    console.log('[BilibiliFrame] iframe loaded, doc accessible. URL:', doc.URL);

    // 注入 CSS 隐藏 B 站 chrome
    const style = doc.createElement('style');
    style.textContent = HIDE_CHROME_CSS;
    (doc.head || doc.documentElement).appendChild(style);
    console.log('[BilibiliFrame] CSS injected');

    // 找 video 元素。B 站 player 异步加载，<video> 不一定立刻有。
    // 轮询最多 10s（B 站慢的时候真要这么久）。
    let attempts = 0;
    const findVideo = () => {
      const v = doc!.querySelector('video') as HTMLVideoElement | null;
      if (v) {
        playerRef.set(v);
        console.log(`[BilibiliFrame] <video> found after ${attempts * 100}ms`);
        return;
      }
      if (++attempts < 100) setTimeout(findVideo, 100);
      else console.warn('[BilibiliFrame] 找不到 <video>（10s 超时）—— B 站 DOM 结构可能变了');
    };
    findVideo();
  };

  useEffect(() => {
    // bvid/epoch 变化导致 iframe 重新挂载，清掉旧 ref
    return () => { playerRef.set(null); };
  }, [bvid, epoch]);

  return (
    <iframe
      ref={ref}
      // key 包含 epoch：换歌时 bvid 变；loop 模式同一首重播时 epoch 变。
      key={`${bvid}-${epoch}`}
      src={src}
      onLoad={onLoad}
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
