// src/renderer/components/FoldedPet.tsx
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state';
import { api } from '../api';
import { ContextMenu } from './ContextMenu';

const PET_MIN = 48;
const PET_MAX = 200;
const PET_STEP = 8;

export function FoldedPet() {
  const emoji = useStore(s => s.config.petEmoji);
  const petSize = useStore(s => s.config.windowState.petSize);
  const setConfig = useStore(s => s.setConfig);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  // 区分拖拽 vs 单击：mousedown 记录起点，mouseup 时位移 < 3px 才算点击
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

  // 拖拽和释放绑在 document 上：快速拖动时鼠标会跑出 80×80 区域，
  // React 元素事件就抓不到了，必须文档级监听才能稳。
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = dragState.current;
      if (!s.down) return;
      const dx = e.screenX - s.startX;
      const dy = e.screenY - s.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) s.didDrag = true;
      if (s.didDrag) {
        api.updateWindowGeometry({ petPos: { x: s.startScreenX + dx, y: s.startScreenY + dy } });
      }
    };
    const onUp = async () => {
      const s = dragState.current;
      if (!s.down) return;
      s.down = false;
      if (s.didDrag) return;
      // 单击 → 展开
      const cfg = useStore.getState().config;
      setConfig({ ...cfg, windowState: { ...cfg.windowState, mode: 'expanded' } });
      await api.setWindowMode({ mode: 'expanded' });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [setConfig]);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  // 滚轮调大小：向上 = 变大，向下 = 变小。
  // 用 document 级 listener 兜底：macOS 透明 panel 在 emoji 之外的透明像素
  // 上不响应元素事件，全局监听更稳。
  useEffect(() => {
    const onGlobalWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cfg = useStore.getState().config;
      const cur = cfg.windowState.petSize;
      const delta = e.deltaY < 0 ? PET_STEP : -PET_STEP;
      const next = Math.max(PET_MIN, Math.min(PET_MAX, cur + delta));
      if (next === cur) return;
      setConfig({ ...cfg, windowState: { ...cfg.windowState, petSize: next } });
      api.updateWindowGeometry({ petSize: next });
    };
    window.addEventListener('wheel', onGlobalWheel, { passive: false });
    return () => window.removeEventListener('wheel', onGlobalWheel);
  }, [setConfig]);

  return (
    <>
      <div
        onMouseDown={onMouseDown}
        onContextMenu={onContextMenu}
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: petSize * 0.72, cursor: 'grab', userSelect: 'none',
          position: 'relative',
          zIndex: 10,
          // 关键：alpha=0.001 让整个 80×80 在合成器层面"算不透明"，
          // mousedown / contextmenu 才能在 emoji 周围的"空白"区域响应。
          // 视觉上 0.001 alpha 在 8-bit 显示器上四舍五入为 0，看不出来。
          background: 'rgba(0,0,0,0.001)',
          animation: 'bob 4s ease-in-out infinite',
        }}
      >
        {emoji}
        <style>{`
          @keyframes bob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
        `}</style>
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} />}
    </>
  );
}
