import { useEffect } from 'react';
import { useStore } from './state';
import { api } from './api';
import { pickNext } from './playback';

/**
 * 监听当前播放视频的 duration,到点自动切下一首。
 * iframe 跨域拿不到真实结束事件,用本地定时器估算。
 */
export function useAutoAdvance() {
  const config = useStore(s => s.config);
  const triggerPlay = useStore(s => s.triggerPlay);
  const paused = useStore(s => s.paused);
  const currentBvid = config.currentBvid;
  const currentPartNum = config.currentPartNum;
  const currentSource = config.sources.find(s => s.id === config.currentSourceId);
  const currentVideo = currentSource?.videos.find(v =>
    v.bvid === currentBvid && (v.partNum ?? null) === currentPartNum
  );
  const duration = currentVideo?.duration ?? 0;

  useEffect(() => {
    if (!currentBvid || !currentSource || duration <= 0 || paused) return;
    const ms = (duration + 2) * 1000;
    const id = setTimeout(async () => {
      const v = pickNext(currentSource, currentBvid, config.playMode, currentPartNum);
      if (v) {
        const cfg = await api.setCurrent({
          sourceId: currentSource.id,
          bvid: v.bvid,
          partNum: v.partNum ?? null,
        });
        triggerPlay(cfg);
      }
    }, ms);
    return () => clearTimeout(id);
  }, [currentBvid, currentPartNum, currentSource, duration, config.playMode, paused, triggerPlay]);
}
