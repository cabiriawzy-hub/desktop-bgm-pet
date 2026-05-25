import { useState } from 'react';
import { useStore } from '../state';
import { api } from '../api';

type Props = { onClose: () => void };

export function SourceMenu({ onClose }: Props) {
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const sources = useStore(s => s.config.sources);
  const currentSourceId = useStore(s => s.config.currentSourceId);
  const setConfig = useStore(s => s.setConfig);

  const onPick = async (sourceId: string) => {
    const src = sources.find(s => s.id === sourceId);
    if (!src || src.videos.length === 0) return;
    const cfg = await api.setCurrent({ sourceId, bvid: src.videos[0].bvid });
    setConfig(cfg);
    onClose();
  };

  const onAdd = async () => {
    setError(null);
    try {
      const cfg = await api.addSource({ url: url.trim() });
      setConfig(cfg);
      setUrl('');
      setAdding(false);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: 70, right: 8,
        background: 'rgba(28,28,38,0.96)',
        backdropFilter: 'blur(20px)',
        borderRadius: 10,
        padding: 6,
        minWidth: 240,
        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 20,
      }}
    >
      <div style={{
        fontSize: 10, color: 'rgba(255,255,255,0.4)',
        padding: '4px 10px 6px', textTransform: 'uppercase',
        letterSpacing: 0.5, fontWeight: 600,
      }}>合集</div>
      {sources.map(s => (
        <div
          key={s.id}
          onClick={() => onPick(s.id)}
          style={{
            padding: '7px 10px', fontSize: 13,
            color: 'rgba(255,255,255,0.9)',
            cursor: 'pointer', borderRadius: 5,
            display: 'flex', alignItems: 'center', gap: 8,
            background: s.id === currentSourceId ? 'rgba(92,182,255,0.15)' : 'transparent',
          }}
        >
          {s.id === currentSourceId ? '✓ ' : '   '}{s.name} ({s.videos.length})
        </div>
      ))}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 4, paddingTop: 4 }}>
        {!adding ? (
          <div
            onClick={() => setAdding(true)}
            style={{ padding: '7px 10px', fontSize: 13, color: '#5cb6ff', cursor: 'pointer', borderRadius: 5 }}
          >+ 粘贴合集 URL 添加</div>
        ) : (
          <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="space.bilibili.com/.../lists/...?type=season"
              style={{
                width: '100%', padding: '5px 8px', fontSize: 11,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 4, color: '#fff', outline: 'none',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onAdd} style={{
                flex: 1, padding: '5px 0', fontSize: 11,
                background: '#5cb6ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
              }}>添加</button>
              <button onClick={() => { setAdding(false); setError(null); }} style={{
                padding: '5px 10px', fontSize: 11,
                background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
              }}>取消</button>
            </div>
            {error && <div style={{ fontSize: 10, color: '#ff7878' }}>{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
