// src/renderer/components/ExpandedPlayer.tsx
import { useState } from 'react';
import { useStore } from '../state';
import { BilibiliFrame } from './BilibiliFrame';
import { TitleBar } from './TitleBar';
import { ResizeHandle } from './ResizeHandle';
import { EmptyState } from './EmptyState';
import { ControlBar } from './ControlBar';
import { ContextMenu } from './ContextMenu';

export function ExpandedPlayer() {
  const [hover, setHover] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const sources = useStore(s => s.config.sources);
  const currentBvid = useStore(s => s.config.currentBvid);
  const playEpoch = useStore(s => s.playEpoch);

  const isEmpty = sources.length === 0;

  return (
    <>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onContextMenu={(e) => {
          // iframe 区域的右键会被 iframe 吃掉，只有 hover 控件层时这里能捕获
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        style={{
          width: '100%', height: '100%',
          borderRadius: 16,
          background: '#0a0a14',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {currentBvid && <BilibiliFrame bvid={currentBvid} epoch={playEpoch} />}
            <div style={{
              opacity: hover ? 1 : 0,
              transition: 'opacity 0.25s',
              pointerEvents: hover ? 'auto' : 'none',
            }}>
              <TitleBar />
              <ControlBar />
            </div>
            <ResizeHandle />
          </>
        )}
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} />}
    </>
  );
}
