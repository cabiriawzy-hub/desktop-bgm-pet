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
  // 按 href 子串命中后藏掉的链接 —— "进入哔哩哔哩" CTA 是个 <a> 指回主站
  const HIDE_HREFS = ['bilibili.com/video', 'b23.tv', 'bilibili.com/bangumi', '//www.bilibili.com'];

  const hideAncestorChain = (el) => {
    // 先找最近的可点击祖先（a / button / role=button），那个通常就是 CTA 容器
    let clickable = el;
    while (clickable && clickable.tagName !== 'BODY' && clickable.tagName !== 'HTML') {
      if (clickable.tagName === 'A' || clickable.tagName === 'BUTTON' ||
          clickable.getAttribute && clickable.getAttribute('role') === 'button') {
        break;
      }
      clickable = clickable.parentElement;
    }
    let target = (clickable && clickable.tagName !== 'BODY' && clickable.tagName !== 'HTML') ? clickable : el;
    // 再向上 walk：只要父级只包它一个（视觉上是这个元素独占的容器），整个父级一起藏
    while (target.parentElement &&
           target.parentElement.children.length === 1 &&
           target.parentElement.tagName !== 'BODY' &&
           target.parentElement.tagName !== 'HTML') {
      target = target.parentElement;
    }
    target.style.setProperty('display', 'none', 'important');
    if (target.dataset) target.dataset.broadcastHidden = '1';
  };

  const inject = () => {
    // 1) CSS 一次注入即可
    if (!document.getElementById('__broadcast_hide_chrome__')) {
      const s = document.createElement('style');
      s.id = '__broadcast_hide_chrome__';
      s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
    }
    // 2) 按文字内容找元素藏起来。覆盖动态加载的 i18n CTA。
    document.querySelectorAll('a, button, div, span, i, p, label, h1, h2, h3, h4').forEach(el => {
      if (el.dataset && el.dataset.broadcastHidden) return;
      const text = (el.textContent || '').trim();
      if (!text || text.length > 100) return;
      if (HIDE_TEXTS.some(t => text.includes(t))) hideAncestorChain(el);
    });
    // 3) 按 href 灭掉指回 B 站主站的链接 —— "进入哔哩哔哩观看更高清"就是这种
    document.querySelectorAll('a[href]').forEach(el => {
      if (el.dataset && el.dataset.broadcastHidden) return;
      const href = el.getAttribute('href') || '';
      if (HIDE_HREFS.some(p => href.includes(p))) hideAncestorChain(el);
    });
  };
  inject();
  new MutationObserver(inject).observe(document.documentElement, { childList: true, subtree: true });
  // 兜底：MutationObserver 偶尔抓不到 B 站延迟挂的 chrome（resize 后才插入的那种），
  // 500ms 再扫一遍保险
  setInterval(inject, 500);
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
        opacity: 0.5,
      }}
    />
  );
}
