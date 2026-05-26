// src/renderer/components/BilibiliFrame.tsx
import { useEffect, useRef } from 'react';
import type { WebviewTag } from 'electron';
import { playerRef } from '../playerRef';
import { useStore } from '../state';

type Props = { bvid: string; epoch: number };

// 隐藏 B 站自带 chrome,同时强制视频铺满。
//
// 死锁教训(0ca36f2):MutationObserver 不能监听 attributes,否则 B 站 progress 每
// 帧改 attr → 触发回调 → 我们改 style → 又是 attr 改动 → 微任务死循环,
// renderer 主线程被锁,executeJavaScript IPC 进不来,视频也不会 init。
//
// 安全的事:
//   1) CSS !important 顶住所有可静态命中的 chrome,免费(无 JS 开销),
//      且会跟随 B 站重渲染自动生效
//   2) MutationObserver 只看 childList(不看 attributes),debounce 后扫一遍 CTA
//   3) 文本/href 扫描只针对 <a>/<button>/[role=button] 这个很小的集合,
//      不走全 DOM、不进 shadow root
//   4) 直接 hide 命中的元素,不做"祖先链"猜测——之前那个 ancestor walk 因为
//      含 "bili" 关键词,会一路 walk 到 .bilibili-player 把整个 player 灭掉
const HIDE_CHROME_JS = `(() => {
  // 注意:不再强制 .bpx-player-video-wrap 100%,那会破坏 B 站 player 的 init
  // 计算并阻止 autoplay。video 自己 100% + object-fit 已经够把内容铺满父容器。
  const css = \`
    video {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      background: #000 !important;
    }
    /* B 站 chrome 黑名单(class 直接命中) */
    .bpx-player-control-wrap,
    .bpx-player-top-wrap,
    .bpx-player-toast-wrap,
    .bpx-player-state-wrap,
    .bpx-player-mask-wrap,
    .bpx-player-loading-wrap,
    .bpx-player-progress-wrap,
    .bpx-player-ending-related,
    .bpx-player-ending-wrap,
    .bpx-player-ending-mask,
    .bpx-player-error-wrap,
    .bpx-player-sending-bar,
    .bpx-player-dialog-wrap,
    .bpx-player-row-dm-wrap,
    .bpx-player-cta-wrap,
    .bpx-player-state-init-mask,
    .bpx-player-state-mask,
    .bpx-player-state-btn,
    .bili-mini-mask,
    .bili-logo,
    .bilibili-player-link,
    .bilibili-player-video-toast,
    .bilibili-player-video-popup,
    [class*="bpx-player-cta"],
    [class*="bpx-player-link"],
    [class*="bpx-player-tips"],
    [class*="state-mask"],
    [class*="state-init"],
    [class*="state-btn"],
    [class*="play-button"],
    [class*="link-bilibili"],
    [class*="watch-bilibili"],
    [class*="login-wrap"],
    [class*="quality-toast"],
    [class*="hd-tip"],
    [class*="goto-bili"],
    [class*="enter-bili"],
    [class*="end-mask"],
    [class*="lottery"],
    [class*="bili-card"],
    [class*="recommendation"],
    [class*="up-card"],
    [class*="up-info"],
    [class*="upper-card"],
    [class*="author-info"],
    [class*="follow-btn"],
    [class*="tips-card"],
    [class*="-cta-"] { display: none !important; }
  \`;
  const HIDE_TEXTS = ['进入哔哩哔哩', '观看更高清', '看完整版', '打开 App', '下载客户端', '登录后免费'];
  const HIDE_HREFS = ['bilibili.com/video', 'b23.tv', 'bilibili.com/bangumi', '//www.bilibili.com'];

  if (!document.getElementById('__broadcast_hide_chrome__')) {
    const s = document.createElement('style');
    s.id = '__broadcast_hide_chrome__';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  // 扫描候选:所有元素,但加严格 safety filter:
  //   - 不已经被我们灭过(broadcastHidden 标记)
  //   - 不是 BODY/HTML
  //   - children 数 ≤ 3(只灭叶子,不灭大块容器)
  //   - text 长度 ≤ 60(短文本才像 CTA)
  // 这样 querySelectorAll('*') 也安全,400ms 跑一次完全 OK,
  // renderer 锁死的真正元凶是 attributes:true observer,不是全 DOM 遍历本身。
  const matchAndHide = (el) => {
    if (!el || el.dataset?.broadcastHidden) return;
    if (el.tagName === 'BODY' || el.tagName === 'HTML') return;
    if (el.children && el.children.length > 3) return;
    const text = (el.textContent || '').trim();
    if (text && text.length <= 60 && HIDE_TEXTS.some(t => text.includes(t))) {
      el.style.setProperty('display', 'none', 'important');
      if (el.dataset) el.dataset.broadcastHidden = '1';
      return;
    }
    if (el.tagName === 'A') {
      const href = el.getAttribute('href') || '';
      if (HIDE_HREFS.some(p => href.includes(p))) {
        el.style.setProperty('display', 'none', 'important');
        if (el.dataset) el.dataset.broadcastHidden = '1';
      }
    }
  };

  const scanCTAs = () => {
    document.querySelectorAll('*').forEach(matchAndHide);
  };

  scanCTAs();

  // 关键安全约束:
  //   - 只观察 childList,不观察 attributes(死锁根因)
  //   - debounce 400ms,B 站一次插一堆节点合并成一次扫描
  //   - 不监听 shadow root(我们的目标 CTA 都在 light DOM)
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; scanCTAs(); }, 400);
  }).observe(document.body || document.documentElement, {
    childList: true, subtree: true,
  });

  // resize 单独监听:B 站 player JS 在 window resize 后会重新决定要不要露"进入哔哩哔哩"CTA。
  // 它有可能是 toggle 现有元素的 visibility/class(不触发 childList → MutationObserver 抓不到),
  // 也可能是把空文本 element 填上字。两种都靠这里的 resize→rescan 兜住。
  // debounce 300ms,避免拖拽 resize 期间狂跑;比 attributes:true 安全得多——
  // 真正的死锁元凶是 attributes observer + 我们自己 setProperty 制造的反馈环。
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(scanCTAs, 300);
  });

  return 'injected';
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
      } catch (err) {
        console.error('[BilibiliFrame] CSS 注入失败:', err);
      }
      playerRef.set(view);
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
