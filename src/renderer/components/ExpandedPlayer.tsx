// src/renderer/components/ExpandedPlayer.tsx
import { useState } from 'react';
import { useStore } from '../state';
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
  const paused = useStore(s => s.paused);
  const togglePaused = useStore(s => s.togglePaused);

  const isEmpty = sources.length === 0;

  return (
    <>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        style={{
          width: '100%', height: '100%',
          borderRadius: 16,
          // 透明外壳——video 在更底层（App.tsx 渲染），上面叠的只是控件层
          background: 'transparent',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)',
          overflow: 'hidden', position: 'relative',
          // 关键：让 mouse 事件穿透到下面的 webview（iframe 才能播）
          // 但子元素（DragLayer/TitleBar/ControlBar）显式 auto 收回事件
          pointerEvents: 'none',
        }}
      >
        {isEmpty ? (
          <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
            <EmptyState />
          </div>
        ) : (
          <>
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
                  pointerEvents: 'auto',
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
                  paddingLeft: 4,
                }}>
                  <IconPlay size={32} strokeWidth={1.5} />
                </div>
              </div>
            )}
            <div style={{ pointerEvents: 'auto' }}>
              <DragLayer />
            </div>
            <div style={{
              opacity: hover ? 1 : 0,
              transition: 'opacity 0.25s',
              pointerEvents: hover ? 'auto' : 'none',
            }}>
              <TitleBar />
              <ControlBar />
            </div>
            <div style={{ pointerEvents: 'auto' }}>
              <ResizeHandle />
            </div>
          </>
        )}
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} />}
    </>
  );
}
