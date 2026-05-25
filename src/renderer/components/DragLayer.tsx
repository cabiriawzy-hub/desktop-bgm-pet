// src/renderer/components/DragLayer.tsx
import { useEffect, useRef } from 'react';
import { api } from '../api';
import { useStore } from '../state';

/**
 * 透明 drag 层。盖在 iframe 上面、控件下面（zIndex 2，control bar 是 5+）。
 * 任意位置按下鼠标都能拖动整个播放器窗口。
 * 双击切换播放/暂停（YouTube/VLC 习惯）。
 */
export function DragLayer() {
  const dragState = useRef({ down: false, startX: 0, startY: 0, startScreenX: 0, startScreenY: 0 });
  const togglePaused = useStore(s => s.togglePaused);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = dragState.current;
      if (!s.down) return;
      api.updateWindowGeometry({
        playerPos: {
          x: s.startScreenX + (e.screenX - s.startX),
          y: s.startScreenY + (e.screenY - s.startY),
        },
      });
    };
    const onUp = () => { dragState.current.down = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragState.current = {
      down: true,
      startX: e.screenX,
      startY: e.screenY,
      startScreenX: window.screenX,
      startScreenY: window.screenY,
    };
  };

  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={togglePaused}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        cursor: 'grab',
      }}
    />
  );
}
