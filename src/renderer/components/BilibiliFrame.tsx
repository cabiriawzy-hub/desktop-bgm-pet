// src/renderer/components/BilibiliFrame.tsx
import { useEffect, useRef } from 'react';
import type { WebviewTag } from 'electron';
import { playerRef } from '../playerRef';
import { useStore } from '../state';

type Props = { bvid: string; epoch: number };

// 隐藏 B 站自带 chrome。
// 这玩意儿反复出现是因为 B 站 player JS 在 resize/重渲染时不停地重新插 CTA。
// 我们能做的就是抢在它后面擦，越快越好。本版升级：
//   1) CSS 类名匹配 + 组合关键词（bili+link、player+cta 等）
//   2) 按文字内容扫整个 light DOM + 所有 Shadow DOM
//   3) 按 href 灭指回 B 站主站的链接
//   4) MutationObserver 监听 childList/attributes，150ms setInterval 兜底
//   5) window.resize 立即扫——B 站 resize 后会重决定要不要 CTA
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
    [class*="-cta-"],
    [class*="bili"][class*="link"],
    [class*="bili"][class*="watch"],
    [class*="player"][class*="link"],
    [class*="player"][class*="cta"],
    [class*="player"][class*="quality-tip"],
    [class*="player"][class*="hd-tip"],
    [class*="player"][class*="rec"],
    [class*="goto-bili"],
    [class*="enter-bili"] { display: none !important; }
    video {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      background: #000 !important;
    }
  \`;
  const HIDE_TEXTS = ['进入哔哩哔哩', '观看更高清', '看完整版', '打开 App', '下载客户端', '登录后免费'];
  const HIDE_HREFS = ['bilibili.com/video', 'b23.tv', 'bilibili.com/bangumi', '//www.bilibili.com'];
  const CHROME_CLASS_KEYWORDS = ['link', 'cta', 'mask', 'overlay', 'tip', 'popup', 'quality', 'rec', 'goto', 'bili'];

  // 遍历 light DOM + 所有 shadow root
  function* walk(root) {
    const all = root.querySelectorAll('*');
    for (const n of all) {
      yield n;
      if (n.shadowRoot) yield* walk(n.shadowRoot);
    }
  }

  const hideAncestorChain = (el) => {
    // 1) 先 walk up 找最近的可点击元素
    let clickable = el;
    while (clickable && clickable.tagName !== 'BODY' && clickable.tagName !== 'HTML') {
      if (clickable.tagName === 'A' || clickable.tagName === 'BUTTON' ||
          (clickable.getAttribute && clickable.getAttribute('role') === 'button')) break;
      clickable = clickable.parentElement;
    }
    let target = (clickable && clickable.tagName !== 'BODY' && clickable.tagName !== 'HTML') ? clickable : el;

    // 2) 继续 walk up：如果父级 class 含 chrome 关键词，或者父级只包它一个，就把父级当目标
    let probe = target;
    while (probe.parentElement && probe.parentElement.tagName !== 'BODY' && probe.parentElement.tagName !== 'HTML') {
      const p = probe.parentElement;
      const cls = ((p.className || '') + '').toLowerCase();
      const matchesChrome = CHROME_CLASS_KEYWORDS.some(k => cls.includes(k));
      const onlyChild = p.children.length === 1;
      if (matchesChrome || onlyChild) target = p;
      else break;
      probe = p;
    }

    target.style.setProperty('display', 'none', 'important');
    if (target.dataset) target.dataset.broadcastHidden = '1';
  };

  const inject = () => {
    if (!document.getElementById('__broadcast_hide_chrome__')) {
      const s = document.createElement('style');
      s.id = '__broadcast_hide_chrome__';
      s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
    }
    for (const el of walk(document)) {
      if (el.dataset && el.dataset.broadcastHidden) continue;
      // 按文字
      const text = (el.textContent || '').trim();
      if (text && text.length <= 100 && HIDE_TEXTS.some(t => text.includes(t))) {
        hideAncestorChain(el);
        continue;
      }
      // 按 href
      if (el.tagName === 'A') {
        const href = el.getAttribute('href') || '';
        if (HIDE_HREFS.some(p => href.includes(p))) hideAncestorChain(el);
      }
    }
  };
  inject();
  new MutationObserver(inject).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true,
  });
  // 150ms 高频兜底——CTA 反复插入主要因为 B 站 resize 时刚插入就被我们灭，
  // 它检测到自己消失会再插。150ms 比它的"再插"周期短一些就稳了。
  setInterval(inject, 150);
  // resize 也立刻扫一次
  window.addEventListener('resize', inject);
  'injected';
})()`;

export function BilibiliFrame({ bvid, epoch }: Props) {
  const ref = useRef<WebviewTag>(null);
  const opacity = useStore(s => s.config.playerOpacity);
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
        // 半透明视频，让桌面壁纸/App 背景从画面里透出来——用户可调
        opacity,
      }}
    />
  );
}
