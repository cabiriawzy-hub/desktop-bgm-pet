// src/renderer/components/ContextMenu.tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../state';
import { api } from '../api';
import { pickNext } from '../playback';
import type { PlayMode } from '../../shared/types';

type Props = { x: number; y: number; onClose: () => void };

const MODE_LABEL: Record<PlayMode, string> = {
  sequential: '顺序播放',
  shuffle: '随机播放',
  loop: '单曲循环',
};

export function ContextMenu({ x, y, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const config = useStore(s => s.config);
  const setConfig = useStore(s => s.setConfig);
  const triggerPlay = useStore(s => s.triggerPlay);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  // 挂载后立刻量自己的尺寸，超出窗口边界就回拉
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pad = 8;
    let nx = x;
    let ny = y;
    if (x + rect.width > w - pad) nx = Math.max(pad, w - rect.width - pad);
    if (y + rect.height > h - pad) ny = Math.max(pad, h - rect.height - pad);
    setPos({ x: nx, y: ny });
  }, [x, y]);

  const pickSource = async (id: string) => {
    const src = config.sources.find(s => s.id === id);
    if (!src || src.videos.length === 0) return;
    const cfg = await api.setCurrent({ sourceId: id, bvid: src.videos[0].bvid });
    triggerPlay(cfg);
    onClose();
  };

  const setMode = async (mode: PlayMode) => {
    const cfg = await api.setPlayMode({ mode });
    setConfig(cfg);
    onClose();
  };

  const skip = async () => {
    const src = config.sources.find(s => s.id === config.currentSourceId);
    if (!src) return;
    const v = pickNext(src, config.currentBvid, config.playMode);
    if (v) {
      const cfg = await api.setCurrent({ sourceId: src.id, bvid: v.bvid });
      triggerPlay(cfg);
    }
    onClose();
  };

  const itemStyle: React.CSSProperties = {
    padding: '7px 10px', fontSize: 13,
    color: 'rgba(255,255,255,0.9)', cursor: 'pointer',
    borderRadius: 5,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, color: 'rgba(255,255,255,0.4)',
    padding: '4px 10px 6px', textTransform: 'uppercase',
    letterSpacing: 0.5, fontWeight: 600,
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: pos ? pos.x : x,
        top: pos ? pos.y : y,
        // 第一次渲染时还没量过尺寸，先隐藏避免抖一下
        visibility: pos ? 'visible' : 'hidden',
        background: 'rgba(28,28,38,0.96)',
        backdropFilter: 'blur(20px)',
        borderRadius: 10, padding: 6, minWidth: 200,
        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 1000,
        // 太长就给滚动，应付窗口很小的情况
        maxHeight: 'calc(100vh - 16px)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
      }}
    >
      {config.sources.length > 0 && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 4 }}>
          <div style={labelStyle}>合集</div>
          {config.sources.map(s => (
            <div
              key={s.id}
              style={{ ...itemStyle, background: s.id === config.currentSourceId ? 'rgba(92,182,255,0.15)' : 'transparent' }}
              onClick={() => pickSource(s.id)}
            >
              {s.id === config.currentSourceId ? '✓ ' : '   '}{s.name}
            </div>
          ))}
        </div>
      )}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '4px 0' }}>
        <div style={labelStyle}>形象</div>
        <div style={{ display: 'flex', gap: 4, padding: '2px 8px 4px', flexWrap: 'wrap' }}>
          {['🪩', '🎧', '📻', '💿', '🎵', '🎶', '🎹', '🎷', '🎸', '🎺', '🥁', '🐱', '🦊', '🐧', '👾'].map(e => (
            <button
              key={e}
              onClick={async () => {
                const cfg = await api.setEmoji({ emoji: e });
                setConfig(cfg);
                onClose();
              }}
              title={e}
              style={{
                width: 28, height: 28, borderRadius: 6,
                background: e === config.petEmoji ? 'rgba(92,182,255,0.2)' : 'rgba(255,255,255,0.05)',
                border: e === config.petEmoji ? '1px solid #5cb6ff' : '1px solid transparent',
                fontSize: 18, lineHeight: 1, cursor: 'pointer',
                padding: 0,
              }}
            >{e}</button>
          ))}
        </div>
      </div>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '4px 0' }}>
        <div style={labelStyle}>播放模式</div>
        {(['sequential', 'shuffle', 'loop'] as PlayMode[]).map(m => (
          <div
            key={m}
            style={{ ...itemStyle, background: m === config.playMode ? 'rgba(92,182,255,0.15)' : 'transparent' }}
            onClick={() => setMode(m)}
          >
            {m === config.playMode ? '✓ ' : '   '}{MODE_LABEL[m]}
          </div>
        ))}
      </div>
      <div style={{ padding: '4px 0' }}>
        {config.currentBvid && (
          <div style={itemStyle} onClick={skip}>⏭ 下一首</div>
        )}
        <div style={{ ...itemStyle, color: '#ff7878' }} onClick={() => api.quit()}>退出</div>
      </div>
    </div>
  );
}
