// src/renderer/components/BilibiliFrame.tsx
import { useEffect, useRef } from 'react';
import type { WebviewTag } from 'electron';
import { playerRef } from '../playerRef';

type Props = { bvid: string; epoch: number };

// 隐藏 B 站自带 chrome。
// 策略：
//   1) CSS 选择器盖一批常见类名（基础层）
//   2) 按文字内容扫 DOM——B 站类名经常变，但 CTA 文字是稳定的（重点防御层）
// 用 MutationObserver 应付 SPA 动态插入，每次 DOM 变化都重新跑一遍
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
  // 按文字命中后藏掉的关键短语
  const HIDE_TEXTS = ['进入哔哩哔哩', '观看更高清', '看完整版', '打开 App', '下载客户端', '登录后免费'];

  const inject = () => {
    // 1) CSS 一次注入即可
    if (!document.getElementById('__broadcast_hide_chrome__')) {
      const s = document.createElement('style');
      s.id = '__broadcast_hide_chrome__';
      s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
    }
    // 2) 按文字内容找元素藏起来。覆盖动态加载的 i18n CTA。
    const allEls = document.querySelectorAll('a, button, div, span');
    for (const el of allEls) {
      if (el.dataset && el.dataset.broadcastHidden) continue;
      const text = (el.textContent || '').trim();
      if (!text || text.length > 50) continue;
      const hit = HIDE_TEXTS.some(t => text.includes(t));
      if (!hit) continue;
      // 向上找：如果父节点只有这一个子节点，整个父节点也藏（避免留下空容器）
      let target = el;
      while (target.parentElement &&
             target.parentElement.children.length === 1 &&
             target.parentElement.tagName !== 'BODY' &&
             target.parentElement.tagName !== 'HTML') {
        target = target.parentElement;
      }
      target.style.setProperty('display', 'none', 'important');
      target.dataset.broadcastHidden = '1';
    }
  };
  inject();
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
        // 半透明视频：让桌面壁纸/App 背景从画面里透出来
        opacity: 0.85,
      }}
    />
  );
}
