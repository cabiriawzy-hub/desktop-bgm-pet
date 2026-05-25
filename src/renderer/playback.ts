import type { Source, PlayMode, Video } from '../shared/types';

export function pickNext(source: Source, currentBvid: string | null, mode: PlayMode): Video | null {
  const videos = source.videos;
  if (videos.length === 0) return null;

  if (mode === 'loop' && currentBvid) {
    return videos.find(v => v.bvid === currentBvid) ?? videos[0];
  }

  if (mode === 'shuffle') {
    if (videos.length === 1) return videos[0];
    let next: Video;
    do {
      next = videos[Math.floor(Math.random() * videos.length)];
    } while (next.bvid === currentBvid);
    return next;
  }

  // sequential
  const idx = videos.findIndex(v => v.bvid === currentBvid);
  return videos[(idx + 1) % videos.length];
}

export function pickPrev(source: Source, currentBvid: string | null, mode: PlayMode): Video | null {
  const videos = source.videos;
  if (videos.length === 0) return null;
  if (mode === 'loop' && currentBvid) {
    return videos.find(v => v.bvid === currentBvid) ?? videos[0];
  }
  if (mode === 'shuffle') {
    return pickNext(source, currentBvid, mode);  // 随机时上一首=下一个随机
  }
  const idx = videos.findIndex(v => v.bvid === currentBvid);
  const prevIdx = idx <= 0 ? videos.length - 1 : idx - 1;
  return videos[prevIdx];
}
