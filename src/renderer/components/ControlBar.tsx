import { useState } from 'react';
import { useStore } from '../state';
import { api } from '../api';
import { ProgressBar } from './ProgressBar';
import { SourceMenu } from './SourceMenu';
import { pickNext, pickPrev } from '../playback';
import type { PlayMode } from '../../shared/types';

const MODE_ICON: Record<PlayMode, string> = {
  sequential: '➡️',
  shuffle: '🔀',
  loop: '🔂',
};

const MODE_NEXT: Record<PlayMode, PlayMode> = {
  sequential: 'shuffle',
  shuffle: 'loop',
  loop: 'sequential',
};

export function ControlBar() {
  const [showSource, setShowSource] = useState(false);
  const config = useStore(s => s.config);
  const setConfig = useStore(s => s.setConfig);

  const currentSource = config.sources.find(s => s.id === config.currentSourceId);
  const currentVideo = currentSource?.videos.find(v => v.bvid === config.currentBvid);
  const duration = currentVideo?.duration ?? 0;

  const playNext = async () => {
    if (!currentSource) return;
    const v = pickNext(currentSource, config.currentBvid, config.playMode);
    if (v) {
      const cfg = await api.setCurrent({ sourceId: currentSource.id, bvid: v.bvid });
      setConfig(cfg);
    }
  };

  const playPrev = async () => {
    if (!currentSource) return;
    const v = pickPrev(currentSource, config.currentBvid, config.playMode);
    if (v) {
      const cfg = await api.setCurrent({ sourceId: currentSource.id, bvid: v.bvid });
      setConfig(cfg);
    }
  };

  const cycleMode = async () => {
    const cfg = await api.setPlayMode({ mode: MODE_NEXT[config.playMode] });
    setConfig(cfg);
  };

  const toggleMute = async () => {
    const cfg = await api.setMuted({ muted: !config.muted });
    setConfig(cfg);
  };

  const btnStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.9)',
    fontSize: 16, cursor: 'pointer', padding: '4px 7px', borderRadius: 5,
    lineHeight: 1,
  };

  return (
    <div
      onClick={() => setShowSource(false)}
      style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 40%)',
        padding: '8px 12px 10px',
        zIndex: 5,
      }}
    >
      <ProgressBar bvid={config.currentBvid} duration={duration} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <button style={btnStyle} onClick={playPrev} title="上一首">⏮</button>
        <button style={btnStyle} onClick={playNext} title="下一首">⏭</button>
        <button style={btnStyle} onClick={cycleMode} title={`播放模式：${config.playMode}`}>
          {MODE_ICON[config.playMode]}
        </button>
        <div style={{ flex: 1 }} />
        <button style={btnStyle} onClick={toggleMute} title={config.muted ? '取消静音' : '静音'}>
          {config.muted ? '🔇' : '🔊'}
        </button>
        <button
          style={btnStyle}
          onClick={(e) => { e.stopPropagation(); setShowSource(v => !v); }}
          title="切换合集"
        >📂</button>
      </div>
      {showSource && <SourceMenu onClose={() => setShowSource(false)} />}
    </div>
  );
}
