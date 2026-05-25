import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state';
import { playerRef } from '../playerRef';

type Props = { bvid: string | null; duration: number };

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ProgressBar({ bvid, duration }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const paused = useStore(s => s.paused);
  const playEpoch = useStore(s => s.playEpoch);
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // 切歌时重置
  useEffect(() => {
    setElapsed(0);
  }, [bvid, playEpoch]);

  // 轮询 video.currentTime —— webview.executeJavaScript 是异步的
  useEffect(() => {
    if (!bvid) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || draggingRef.current) return;
      const t = await playerRef.currentTime();
      if (!cancelled && t > 0) setElapsed(t);
    };
    const id = setInterval(tick, 500);
    return () => { cancelled = true; clearInterval(id); };
  }, [bvid, playEpoch]);

  const seekTo = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || duration <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const t = ratio * duration;
    playerRef.seek(t);
    setElapsed(t);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!playerRef.isReady()) return;
    draggingRef.current = true;
    seekTo(e.clientX);
  };

  // 拖拽 seek：document 监听，跑出条外也能继续
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      seekTo(e.clientX);
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [duration]);

  const pct = duration > 0 ? (elapsed / duration) * 100 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums', minWidth: 36 }}>
        {formatTime(elapsed)}
      </span>
      <div
        ref={barRef}
        onMouseDown={onMouseDown}
        style={{
          flex: 1, height: 4,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 2, position: 'relative',
          cursor: 'pointer',
        }}
      >
        <div style={{
          height: '100%', background: paused ? 'rgba(255,255,255,0.45)' : '#5cb6ff',
          borderRadius: 2, width: `${pct}%`,
          transition: draggingRef.current ? 'none' : 'width 0.3s linear',
          pointerEvents: 'none',
        }} />
      </div>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>
        {formatTime(duration)}
      </span>
    </div>
  );
}
