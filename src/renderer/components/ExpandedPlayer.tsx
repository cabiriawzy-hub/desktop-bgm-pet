// src/renderer/components/ExpandedPlayer.tsx
import { useState } from 'react';
import { useStore } from '../state';
import { BilibiliFrame } from './BilibiliFrame';
import { TitleBar } from './TitleBar';
import { ResizeHandle } from './ResizeHandle';
import { EmptyState } from './EmptyState';

export function ExpandedPlayer() {
  const [hover, setHover] = useState(false);
  const sources = useStore(s => s.config.sources);
  const currentBvid = useStore(s => s.config.currentBvid);

  const isEmpty = sources.length === 0;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', height: '100%',
        borderRadius: 16,
        background: '#0a0a14',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {currentBvid && <BilibiliFrame bvid={currentBvid} />}
          <div style={{
            opacity: hover ? 1 : 0,
            transition: 'opacity 0.25s',
            pointerEvents: hover ? 'auto' : 'none',
          }}>
            <TitleBar />
            {/* ControlBar 在 Task 10 加 */}
          </div>
          <ResizeHandle />
        </>
      )}
    </div>
  );
}
