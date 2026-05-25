// src/renderer/components/ResizeHandle.tsx
import { useEffect, useRef } from 'react';
import { useStore } from '../state';
import { api } from '../api';

export function ResizeHandle() {
  const setConfig = useStore(s => s.setConfig);
  const dragState = useRef({ down: false, startX: 0, startY: 0, startW: 0, startH: 0 });

  // 全局监听 mousemove/mouseup —— 拖到窗口外也要响应
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = dragState.current;
      if (!s.down) return;
      const w = Math.min(900, Math.max(240, s.startW + (e.screenX - s.startX)));
      const h = Math.min(600, Math.max(160, s.startH + (e.screenY - s.startY)));
      const cfg = useStore.getState().config;
      setConfig({ ...cfg, windowState: { ...cfg.windowState, playerSize: { w, h } } });
      api.updateWindowGeometry({ playerSize: { w, h } });
    };
    const onUp = () => { dragState.current.down = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [setConfig]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cfg = useStore.getState().config;
    dragState.current = {
      down: true,
      startX: e.screenX,
      startY: e.screenY,
      startW: cfg.windowState.playerSize.w,
      startH: cfg.windowState.playerSize.h,
    };
  };

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        bottom: 0, right: 0,
        width: 18, height: 18,
        cursor: 'nwse-resize',
        zIndex: 15,
      }}
    >
      <div style={{
        position: 'absolute',
        bottom: 4, right: 4,
        width: 0, height: 0,
        borderStyle: 'solid',
        borderWidth: '0 0 10px 10px',
        borderColor: 'transparent transparent rgba(255,255,255,0.35) transparent',
      }} />
    </div>
  );
}
