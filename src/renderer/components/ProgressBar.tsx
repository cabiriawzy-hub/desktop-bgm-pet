import { useEffect, useState } from 'react';
import { useStore } from '../state';

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

  // 切歌或者从暂停恢复（epoch bump）时重置到 0
  useEffect(() => {
    setElapsed(0);
  }, [bvid, playEpoch]);

  // 不在暂停时才走计时器
  useEffect(() => {
    if (!bvid || paused) return;
    const id = setInterval(() => {
      setElapsed(e => Math.min(duration, e + 1));
    }, 1000);
    return () => clearInterval(id);
  }, [bvid, duration, paused]);

  const pct = duration > 0 ? (elapsed / duration) * 100 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums', minWidth: 36 }}>
        {formatTime(elapsed)}
      </span>
      <div style={{
        flex: 1, height: 4,
        background: 'rgba(255,255,255,0.2)',
        borderRadius: 2, position: 'relative',
      }}>
        <div style={{
          height: '100%', background: paused ? 'rgba(255,255,255,0.4)' : '#5cb6ff',
          borderRadius: 2, width: `${pct}%`,
          transition: 'width 0.3s linear',
        }} />
      </div>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>
        {formatTime(duration)}
      </span>
    </div>
  );
}
