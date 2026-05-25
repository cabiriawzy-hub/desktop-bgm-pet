// src/renderer/components/ExpandedPlayer.tsx
import { useState } from 'react';
import { useStore } from '../state';
import { BilibiliFrame } from './BilibiliFrame';
import { TitleBar } from './TitleBar';
import { ResizeHandle } from './ResizeHandle';
import { EmptyState } from './EmptyState';
import { ControlBar } from './ControlBar';
import { ContextMenu } from './ContextMenu';
import { DragLayer } from './DragLayer';
import { IconPlay } from './icons';

export function ExpandedPlayer() {
  const [hover, setHover] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const sources = useStore(s => s.config.sources);
  const currentBvid = useStore(s => s.config.currentBvid);
  const playEpoch = useStore(s => s.playEpoch);
  const paused = useStore(s => s.paused);
  const togglePaused = useStore(s => s.togglePaused);

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
            {paused && (
              <div
                onClick={togglePaused}
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(2px)',
                  zIndex: 3,
                }}
                title="点击播放"
              >
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.95)',
                  paddingLeft: 4,  // ▶ 重心偏左，留点 padding 让它看着居中
                }}>
                  <IconPlay size={32} strokeWidth={1.5} />
                </div>
              </div>
            )}
            <DragLayer />
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
