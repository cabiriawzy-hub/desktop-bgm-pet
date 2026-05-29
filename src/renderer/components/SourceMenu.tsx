import { useState } from 'react';
import { useStore } from '../state';
import { api } from '../api';

type Props = { onClose: () => void };
type View = 'tracks' | 'sources';

function CategoryHeader({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div style={{
      padding: '8px 10px 4px',
      fontSize: 10,
      fontWeight: 600,
      color: 'rgba(255,255,255,0.45)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}>
      <span>{emoji}</span>
      <span>{label}</span>
    </div>
  );
}

export function SourceMenu({ onClose }: Props) {
  const [view, setView] = useState<View>('tracks');
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<'music' | 'learning'>('music');
  const sources = useStore(s => s.config.sources);
  const currentSourceId = useStore(s => s.config.currentSourceId);
  const currentBvid = useStore(s => s.config.currentBvid);
  const currentPartNum = useStore(s => s.config.currentPartNum);
  const setConfig = useStore(s => s.setConfig);
  const triggerPlay = useStore(s => s.triggerPlay);

  const currentSource = sources.find(s => s.id === currentSourceId);

  const pickTrack = async (bvid: string, partNum: number | null) => {
    if (!currentSource) return;
    const cfg = await api.setCurrent({ sourceId: currentSource.id, bvid, partNum });
    triggerPlay(cfg);
    onClose();
  };

  const switchSource = async (sourceId: string) => {
    const src = sources.find(s => s.id === sourceId);
    if (!src || src.videos.length === 0) return;
    const first = src.videos[0];
    const cfg = await api.setCurrent({ sourceId, bvid: first.bvid, partNum: first.partNum ?? null });
    triggerPlay(cfg);
    setView('tracks');
    onClose();
  };

  const onAdd = async () => {
    setError(null);
    try {
      const prevCurrent = useStore.getState().config.currentBvid;
      const cfg = await api.addSource({ url: url.trim(), category: newCategory });
      if (!prevCurrent && cfg.currentBvid) triggerPlay(cfg);
      else setConfig(cfg);
      setUrl('');
      setAdding(false);
      setNewCategory('music');  // reset for next add
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  // 共用样式
  const rowStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 10px',
    fontSize: 12,
    color: active ? '#5cb6ff' : 'rgba(255,255,255,0.85)',
    cursor: 'pointer',
    borderRadius: 5,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: active ? 'rgba(92,182,255,0.15)' : 'transparent',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
  });

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: 70, right: 8,
        background: 'rgba(28,28,38,0.96)',
        backdropFilter: 'blur(20px)',
        borderRadius: 10,
        padding: 4,
        width: 280,
        maxWidth: 'calc(100% - 16px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 4,
      }}>
        {view === 'tracks' ? (
          <>
            <div style={{
              flex: 1, minWidth: 0,
              fontSize: 11, fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase', letterSpacing: 0.5,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {currentSource?.name ?? '未选择合集'}
            </div>
            <button
              onClick={() => setView('sources')}
              title="切换合集"
              style={{
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: 'rgba(255,255,255,0.75)',
                padding: '3px 8px', fontSize: 10,
                borderRadius: 4, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >合集 ▾</button>
          </>
        ) : (
          <>
            <button
              onClick={() => setView('tracks')}
              title="返回曲目"
              style={{
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: 'rgba(255,255,255,0.75)',
                padding: '3px 8px', fontSize: 10,
                borderRadius: 4, cursor: 'pointer',
              }}
            >← 返回</button>
            <div style={{
              flex: 1,
              fontSize: 11, fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>选择合集</div>
          </>
        )}
      </div>

      {/* Scrollable list */}
      <div style={{
        maxHeight: 240,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
      }}>
        {view === 'tracks' && currentSource && currentSource.videos.length > 0 ? (
          currentSource.videos.map((v, i) => {
            const active = v.bvid === currentBvid && (v.partNum ?? null) === currentPartNum;
            return (
              <div
                key={`${v.bvid}-p${v.partNum ?? 0}`}
                onClick={() => pickTrack(v.bvid, v.partNum ?? null)}
                title={v.title}
                style={rowStyle(active)}
              >
                <span style={{
                  width: 14, flexShrink: 0, fontSize: 10,
                  color: active ? '#5cb6ff' : 'rgba(255,255,255,0.35)',
                  fontVariantNumeric: 'tabular-nums', textAlign: 'right',
                }}>
                  {active ? '♪' : i + 1}
                </span>
                <span style={{
                  flex: 1, minWidth: 0,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {v.title}
                </span>
              </div>
            );
          })
        ) : view === 'tracks' ? (
          <div style={{
            padding: '16px 10px',
            fontSize: 11, color: 'rgba(255,255,255,0.45)',
            textAlign: 'center',
          }}>
            合集是空的
          </div>
        ) : (
          (() => {
            const music = sources.filter(s => s.category === 'music');
            const learning = sources.filter(s => s.category === 'learning');
            const renderRow = (s: typeof sources[number]) => (
              <div
                key={s.id}
                onClick={() => switchSource(s.id)}
                style={rowStyle(s.id === currentSourceId)}
              >
                <span style={{
                  width: 14, flexShrink: 0, fontSize: 11,
                  color: s.id === currentSourceId ? '#5cb6ff' : 'transparent',
                }}>✓</span>
                <span style={{
                  flex: 1, minWidth: 0,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {s.name}
                </span>
                <span style={{
                  fontSize: 10, color: 'rgba(255,255,255,0.4)',
                  fontVariantNumeric: 'tabular-nums',
                }}>{s.videos.length}</span>
              </div>
            );
            return (
              <>
                {music.length > 0 && <CategoryHeader emoji="🎵" label="音乐" />}
                {music.map(renderRow)}
                {learning.length > 0 && <CategoryHeader emoji="📖" label="英文学习" />}
                {learning.map(renderRow)}
              </>
            );
          })()
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        marginTop: 4,
      }}>
        {!adding ? (
          <div
            onClick={() => setAdding(true)}
            style={{
              padding: '7px 10px', fontSize: 12,
              color: '#5cb6ff', cursor: 'pointer', borderRadius: 5,
            }}
          >+ 粘贴 URL 添加合集</div>
        ) : (
          <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setNewCategory('music')}
                  style={{
                    flex: 1, padding: '4px 0', fontSize: 11,
                    background: newCategory === 'music' ? 'rgba(92,182,255,0.25)' : 'rgba(255,255,255,0.06)',
                    color: newCategory === 'music' ? '#5cb6ff' : 'rgba(255,255,255,0.75)',
                    border: 'none', borderRadius: 4, cursor: 'pointer',
                  }}
                >🎵 音乐</button>
                <button
                  onClick={() => setNewCategory('learning')}
                  style={{
                    flex: 1, padding: '4px 0', fontSize: 11,
                    background: newCategory === 'learning' ? 'rgba(92,182,255,0.25)' : 'rgba(255,255,255,0.06)',
                    color: newCategory === 'learning' ? '#5cb6ff' : 'rgba(255,255,255,0.75)',
                    border: 'none', borderRadius: 4, cursor: 'pointer',
                  }}
                >📖 英文学习</button>
              </div>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="space.bilibili.com/... 或 bilibili.com/video/BV..."
                style={{
                  width: '100%', padding: '5px 8px', fontSize: 11,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 4, color: '#fff', outline: 'none',
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={onAdd} style={{
                  flex: 1, padding: '5px 0', fontSize: 11,
                  background: '#5cb6ff', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}>添加</button>
                <button onClick={() => { setAdding(false); setError(null); }} style={{
                  padding: '5px 10px', fontSize: 11,
                  background: 'rgba(255,255,255,0.1)', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}>取消</button>
              </div>
              {error && <div style={{ fontSize: 10, color: '#ff7878' }}>{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
