// src/renderer/components/BilibiliFrame.tsx
import { useEffect, useRef } from 'react';
import type { WebviewTag } from 'electron';
import { playerRef } from '../playerRef';

type Props = { bvid: string; epoch: number };

// 隐藏 B 站自带 chrome：顶部 logo/标题、UP 信息、"进入哔哩哔哩" CTA、
// 它自己的播放控件、loading、toast、各种弹出。
const HIDE_CHROME_JS = `(() => {
  const css = \`
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
    [class*="-cta-"] { display: none !important; }
    video {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      background: #000 !important;
    }
  \`;
  const inject = () => {
    if (document.getElementById('__broadcast_hide_chrome__')) return;
    const s = document.createElement('style');
    s.id = '__broadcast_hide_chrome__';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  };
  inject();
  // 兜底：B 站 SPA 加载完后会动态插控件，MutationObserver 保证 CSS 一直在
  new MutationObserver(inject).observe(document.documentElement, { childList: true, subtree: true });
  'injected';
})()`;

export function BilibiliFrame({ bvid, epoch }: Props) {
  const ref = useRef<WebviewTag>(null);
  const src = `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=1&danmaku=0&hideCoverInfo=1`;

  useEffect(() => {
    const view = ref.current;
    if (!view) return;

    const onDomReady = async () => {
      try {
        await view.executeJavaScript(HIDE_CHROME_JS);
        console.log('[BilibiliFrame] chrome CSS injected');
      } catch (err) {
        console.error('[BilibiliFrame] CSS 注入失败:', err);
      }
      playerRef.set(view);
      console.log('[BilibiliFrame] playerRef ready');
    };

    view.addEventListener('dom-ready', onDomReady);
    return () => {
      view.removeEventListener('dom-ready', onDomReady);
      playerRef.set(null);
    };
  }, [bvid, epoch]);

  return (
    // 注意：<webview> 必须显式 width/height 属性（CSS 单独 width:100% 会让它折叠）
    <webview
      ref={ref}
      key={`${bvid}-${epoch}`}
      src={src}
      allowpopups={undefined as any}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'flex',
        background: '#000',
      }}
    />
  );
}
