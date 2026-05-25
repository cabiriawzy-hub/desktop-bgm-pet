// src/renderer/components/FoldedPet.tsx
import { useRef } from 'react';
import { useStore } from '../state';
import { api } from '../api';

export function FoldedPet() {
  const emoji = useStore(s => s.config.petEmoji);
  const hasSource = useStore(s => s.config.sources.length > 0);
  const setConfig = useStore(s => s.setConfig);

  // 区分拖拽 vs 单击：mousedown 记录起点，mouseup 时距离 < 3px 才算点击
  const dragState = useRef({ down: false, didDrag: false, startX: 0, startY: 0, startScreenX: 0, startScreenY: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragState.current = {
      down: true,
      didDrag: false,
      startX: e.screenX,
      startY: e.screenY,
      startScreenX: window.screenX,
      startScreenY: window.screenY,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const s = dragState.current;
    if (!s.down) return;
    const dx = e.screenX - s.startX;
    const dy = e.screenY - s.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) s.didDrag = true;
    if (s.didDrag) {
      const nx = s.startScreenX + dx;
      const ny = s.startScreenY + dy;
      api.updateWindowGeometry({ petPos: { x: nx, y: ny } });
    }
  };

  const onMouseUp = async (e: React.MouseEvent) => {
    const s = dragState.current;
    s.down = false;
    if (s.didDrag) return;
    // 单击 → 展开
    const cfg = useStore.getState().config;
    setConfig({ ...cfg, windowState: { ...cfg.windowState, mode: 'expanded' } });
    await api.setWindowMode({ mode: 'expanded' });
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // 右键菜单交给 ContextMenu 组件（Task 11 接入），这里只 stub
    // 暂时用原生 alert 占位
  };

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onContextMenu={onContextMenu}
      style={{
        width: 80,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 56,
        cursor: 'grab',
        userSelect: 'none',
        position: 'relative',
        filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.55))',
        animation: 'bob 4s ease-in-out infinite',
      }}
    >
      {emoji}
      {hasSource && (
        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#ff5a5a',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.4), 0 0 12px rgba(255,90,90,0.8)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}
      <style>{`
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
