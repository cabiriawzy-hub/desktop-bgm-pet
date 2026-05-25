// src/renderer/components/EmptyState.tsx
import { useState } from 'react';
import { useStore } from '../state';
import { api } from '../api';

export function EmptyState() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const triggerPlay = useStore(s => s.triggerPlay);

  const onAdd = async () => {
    if (!url.trim()) return;
    setError(null);
    setLoading(true);
    try {
      // AddSource IPC handler 内部已经处理「无 current 时自动选中第一首」
      const cfg = await api.addSource({ url: url.trim() });
      // 空状态进来时一定没有 current，这里加完一定会有，bump epoch 启动播放
      triggerPlay(cfg);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0a0a14',
      borderRadius: 16,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, gap: 12,
    }}>
      <div style={{ fontSize: 32 }}>🪩</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center' }}>
        粘贴一个 B 站合集 URL 来开始
      </div>
      <input
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://space.bilibili.com/.../lists/...?type=season"
        style={{
          width: '100%', padding: '6px 10px', fontSize: 12,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 6, color: '#fff', outline: 'none',
        }}
      />
      <button
        onClick={onAdd}
        disabled={loading}
        style={{
          padding: '6px 16px', fontSize: 12,
          background: '#5cb6ff', color: '#fff', border: 'none', borderRadius: 6,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >{loading ? '拉取中...' : '添加'}</button>
      {error && <div style={{ fontSize: 11, color: '#ff7878', textAlign: 'center' }}>{error}</div>}
    </div>
  );
}
