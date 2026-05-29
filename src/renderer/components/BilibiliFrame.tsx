// src/renderer/components/BilibiliFrame.tsx
import { useEffect, useRef } from 'react';
import type { WebviewTag } from 'electron';
import { playerRef } from '../playerRef';
import { useStore } from '../state';

type Props = { bvid: string; partNum: number | null; epoch: number };

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
    .bpx-player-loading-panel,
    [class*="bpx-player-loading"],
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
    .bpx-player-play-pause-button,
    [class*="play-pause-button"],
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
    [class*="pause-related"],
    [class*="pause-recommend"],
    [class*="related-card"],
    [class*="recommend-card"],
    [class*="cards-wrap"],
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
    if (!el || el.tagName === 'BODY' || el.tagName === 'HTML') return;

    // 已经命中过的:确认 hide 还生效(B 站会偷偷把 display 改回 block,我们要兜回去)
    if (el.dataset?.broadcastHidden === '1') {
      if (getComputedStyle(el).display !== 'none') {
        el.style.setProperty('display', 'none', 'important');
      }
      return;
    }

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
  //   - MutationObserver callback 是微任务,在 DOM 变更后、浏览器下次 paint 前
  //     触发。同步调 scanCTAs 能在 paint 前灭掉 CTA,用户根本看不到闪烁。
  //   - 不监听 shadow root(我们的目标 CTA 都在 light DOM)
  //   - 我们自己 setProperty('display','none') 是 attribute 变更,不会触发
  //     childList observer,无反馈环风险。MO 还会把同一 tick 内的多次 mutation
  //     batch 成一次 callback,所以同步处理也不会爆 CPU。
  new MutationObserver(scanCTAs).observe(document.body || document.documentElement, {
    childList: true, subtree: true,
  });

  // resize 单独监听:B 站 player JS 在 window resize 后会重新决定要不要露"进入哔哩哔哩"CTA。
  // 它有可能是 toggle 现有元素的 visibility/class(不触发 childList → MutationObserver 抓不到),
  // 也可能是把空文本 element 填上字。两种都靠这里的 resize→rescan 兜住。
  // 立即扫一次消除闪烁;再加一个 300ms debounce 的 fallback,拖拽停下后再扫一次兜底。
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    scanCTAs();
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(scanCTAs, 300);
  });

  // 500ms 兜底:防止 B 站走了某条 MutationObserver/resize 都抓不到的路径(比如
  // attribute 切换 display:block)。这是纯轮询,没 attributes observer 反馈环
  // 风险,renderer 不会锁死。scanCTAs 自身 bounded,2 Hz 全 DOM 遍历的开销可忽略。
  setInterval(scanCTAs, 500);

  return 'injected';
})()`;

export function BilibiliFrame({ bvid, partNum, epoch }: Props) {
  const ref = useRef<WebviewTag>(null);
  const opacity = useStore(s => s.config.playerOpacity);
  const partSuffix = partNum != null ? `&p=${partNum}` : '';
  const src = `https://player.bilibili.com/player.html?bvid=${bvid}${partSuffix}&autoplay=1&danmaku=0&hideCoverInfo=1`;

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
  }, [bvid, partNum, epoch]);

  return (
    // 注意：<webview> 必须显式 width/height 属性（CSS 单独 width:100% 会让它折叠）
    <webview
      ref={ref}
      key={`${bvid}-p${partNum ?? 0}-${epoch}`}
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
