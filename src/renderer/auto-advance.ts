// src/renderer/auto-advance.ts
import { useEffect } from 'react';
import { useStore } from './state';
import { api } from './api';
import { pickNext } from './playback';

/**
 * 监听当前播放视频的 duration，到点自动切下一首。
 * iframe 跨域拿不到真实结束事件，用本地定时器估算。
 */
export function useAutoAdvance() {
  const config = useStore(s => s.config);
  const setConfig = useStore(s => s.setConfig);
  const currentBvid = config.currentBvid;
  const currentSource = config.sources.find(s => s.id === config.currentSourceId);
  const currentVideo = currentSource?.videos.find(v => v.bvid === currentBvid);
  const duration = currentVideo?.duration ?? 0;

  useEffect(() => {
    if (!currentBvid || !currentSource || duration <= 0) return;

    // duration 是秒，加 2s buffer 防止过早切
    const ms = (duration + 2) * 1000;
    const id = setTimeout(async () => {
      const v = pickNext(currentSource, currentBvid, config.playMode);
      if (v) {
        const cfg = await api.setCurrent({ sourceId: currentSource.id, bvid: v.bvid });
        setConfig(cfg);
      }
    }, ms);

    return () => clearTimeout(id);
  }, [currentBvid, currentSource, duration, config.playMode, setConfig]);
}
