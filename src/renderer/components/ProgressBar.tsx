import { useEffect, useState } from 'react';

type Props = { bvid: string | null; duration: number };

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ProgressBar({ bvid, duration }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    if (!bvid) return;
    const t0 = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.min(duration, (Date.now() - t0) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [bvid, duration]);

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
          height: '100%', background: '#5cb6ff',
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
