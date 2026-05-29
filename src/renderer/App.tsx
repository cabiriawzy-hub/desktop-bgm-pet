// src/renderer/App.tsx
import { useEffect } from 'react';
import { useStore } from './state';
import { FoldedPet } from './components/FoldedPet';
import { ExpandedPlayer } from './components/ExpandedPlayer';
import { BilibiliFrame } from './components/BilibiliFrame';
import { useAutoAdvance } from './auto-advance';

export default function App() {
  const ready = useStore(s => s.ready);
  const hydrate = useStore(s => s.hydrate);
  const mode = useStore(s => s.config.windowState.mode);
  const currentBvid = useStore(s => s.config.currentBvid);
  const currentPartNum = useStore(s => s.config.currentPartNum);
  const playEpoch = useStore(s => s.playEpoch);

  useEffect(() => { hydrate(); }, [hydrate]);
  useAutoAdvance();

  // 兜底：JS 直接把 html/body 设透明，应付某些 CSS 路径渗漏白底
  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    // 诊断：打到 console，确认每层确实是透明
    console.log('[bg debug]');
    console.log('  html:', getComputedStyle(document.documentElement).backgroundColor);
    console.log('  body:', getComputedStyle(document.body).backgroundColor);
    const root = document.getElementById('root');
    if (root) console.log('  #root:', getComputedStyle(root).backgroundColor);
    console.log('  window inner:', window.innerWidth, '×', window.innerHeight);
    console.log('  devicePixelRatio:', window.devicePixelRatio);
  }, []);

  if (!ready) return null;

  return (
    <>
      {/* 持久化的 BilibiliFrame：永远挂在 App 根上，折叠时 visibility:hidden 但保持 webContents 活着，
          音频继续播。展开时 visible，铺满窗口。 */}
      {currentBvid && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: mode === 'expanded' ? 16 : 0,
          overflow: 'hidden',
          visibility: mode === 'expanded' ? 'visible' : 'hidden',
          pointerEvents: mode === 'expanded' ? 'auto' : 'none',
          zIndex: 0,
          background: 'rgba(10, 10, 20, 0.3)',  // 透明视频后面的轻微深色衬底
        }}>
          <BilibiliFrame bvid={currentBvid} partNum={currentPartNum} epoch={playEpoch} />
        </div>
      )}

      {mode === 'folded' && <FoldedPet />}
      {mode === 'expanded' && <ExpandedPlayer />}
    </>
  );
}
