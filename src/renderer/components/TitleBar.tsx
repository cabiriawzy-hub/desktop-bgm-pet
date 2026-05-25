// src/renderer/components/TitleBar.tsx
import { useEffect, useRef } from 'react';
import { useStore } from '../state';
import { api } from '../api';
import { IconFold, IconClose } from './icons';

export function TitleBar() {
  const sources = useStore(s => s.config.sources);
  const currentSourceId = useStore(s => s.config.currentSourceId);
  const currentBvid = useStore(s => s.config.currentBvid);
  const setConfig = useStore(s => s.setConfig);

  const currentSource = sources.find(s => s.id === currentSourceId);
  const currentVideo = currentSource?.videos.find(v => v.bvid === currentBvid);
  const title = currentVideo?.title ?? '—';

  const dragState = useRef({ down: false, startX: 0, startY: 0, startScreenX: 0, startScreenY: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    dragState.current = {
      down: true,
      startX: e.screenX,
      startY: e.screenY,
      startScreenX: window.screenX,
      startScreenY: window.screenY,
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = dragState.current;
      if (!s.down) return;
      const dx = e.screenX - s.startX;
      const dy = e.screenY - s.startY;
      api.updateWindowGeometry({ playerPos: { x: s.startScreenX + dx, y: s.startScreenY + dy } });
    };
    const onUp = () => { dragState.current.down = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onFold = async () => {
    const cfg = useStore.getState().config;
    setConfig({ ...cfg, windowState: { ...cfg.windowState, mode: 'folded' } });
    await api.setWindowMode({ mode: 'folded' });
  };

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        height: 32,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 100%)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 10,
        cursor: 'grab',
      }}
    >
      <div style={{
        flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.85)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        fontWeight: 500,
      }}>{title}</div>
      <button
        onClick={onFold}
        style={{
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
          cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="收起为图标"
      ><IconFold size={12} strokeWidth={2} /></button>
      <button
        onClick={() => api.quit()}
        style={{
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
          cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="退出应用"
      ><IconClose size={11} strokeWidth={2} /></button>
    </div>
  );
}
