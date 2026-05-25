import { useState, type ReactNode } from 'react';
import { useStore } from '../state';
import { api } from '../api';
import { ProgressBar } from './ProgressBar';
import { SourceMenu } from './SourceMenu';
import { pickNext, pickPrev } from '../playback';
import type { PlayMode } from '../../shared/types';
import {
  IconPrev, IconNext, IconPlay, IconPause,
  IconSequential, IconShuffle, IconLoop,
  IconVolume, IconMute, IconLibrary,
} from './icons';

const MODE_ICON: Record<PlayMode, ReactNode> = {
  sequential: <IconSequential />,
  shuffle: <IconShuffle />,
  loop: <IconLoop />,
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
  const triggerPlay = useStore(s => s.triggerPlay);
  const paused = useStore(s => s.paused);
  const togglePaused = useStore(s => s.togglePaused);

  const currentSource = config.sources.find(s => s.id === config.currentSourceId);
  const currentVideo = currentSource?.videos.find(v => v.bvid === config.currentBvid);
  const duration = currentVideo?.duration ?? 0;

  const playNext = async () => {
    if (!currentSource) return;
    const v = pickNext(currentSource, config.currentBvid, config.playMode);
    if (v) {
      const cfg = await api.setCurrent({ sourceId: currentSource.id, bvid: v.bvid });
      triggerPlay(cfg);
    }
  };

  const playPrev = async () => {
    if (!currentSource) return;
    const v = pickPrev(currentSource, config.currentBvid, config.playMode);
    if (v) {
      const cfg = await api.setCurrent({ sourceId: currentSource.id, bvid: v.bvid });
      triggerPlay(cfg);
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
    background: 'none', border: 'none',
    color: 'rgba(255,255,255,0.85)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: 6,
    lineHeight: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s, color 0.15s',
  };

  return (
    <div
      onClick={() => setShowSource(false)}
      style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 40%)',
        padding: '8px 12px 10px',
        zIndex: 5,
      }}
    >
      <ProgressBar bvid={config.currentBvid} duration={duration} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <button style={btnStyle} onClick={playPrev} title="上一首"><IconPrev /></button>
        <button
          style={btnStyle}
          onClick={togglePaused}
          title={paused ? '播放' : '暂停'}
        >{paused ? <IconPlay /> : <IconPause />}</button>
        <button style={btnStyle} onClick={playNext} title="下一首"><IconNext /></button>
        <button style={btnStyle} onClick={cycleMode} title={`播放模式：${config.playMode}`}>
          {MODE_ICON[config.playMode]}
        </button>
        <div style={{ flex: 1 }} />
        <button style={btnStyle} onClick={toggleMute} title={config.muted ? '取消静音' : '静音'}>
          {config.muted ? <IconMute /> : <IconVolume />}
        </button>
        <button
          style={btnStyle}
          onClick={(e) => { e.stopPropagation(); setShowSource(v => !v); }}
          title="切换合集"
        ><IconLibrary /></button>
      </div>
      {showSource && <SourceMenu onClose={() => setShowSource(false)} />}
    </div>
  );
}
