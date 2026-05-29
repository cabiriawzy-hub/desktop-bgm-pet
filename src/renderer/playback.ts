import type { Source, PlayMode, Video } from '../shared/types';

/** 同一 source 内,(bvid, partNum) 元组才能唯一识别一个 Video——
 *  对 parts 类型 source 来说所有 video 共享 bvid。
 */
function findIndex(videos: Video[], bvid: string | null, partNum: number | null): number {
  return videos.findIndex(v => v.bvid === bvid && (v.partNum ?? null) === partNum);
}

export function pickNext(
  source: Source,
  currentBvid: string | null,
  mode: PlayMode,
  currentPartNum: number | null,
): Video | null {
  const videos = source.videos;
  if (videos.length === 0) return null;

  if (mode === 'loop' && currentBvid) {
    return videos[findIndex(videos, currentBvid, currentPartNum)] ?? videos[0];
  }

  if (mode === 'shuffle') {
    if (videos.length === 1) return videos[0];
    const idx = findIndex(videos, currentBvid, currentPartNum);
    let next: Video;
    let nextIdx: number;
    do {
      nextIdx = Math.floor(Math.random() * videos.length);
      next = videos[nextIdx];
    } while (nextIdx === idx);
    return next;
  }

  // sequential
  const idx = findIndex(videos, currentBvid, currentPartNum);
  return videos[(idx + 1) % videos.length];
}

export function pickPrev(
  source: Source,
  currentBvid: string | null,
  mode: PlayMode,
  currentPartNum: number | null,
): Video | null {
  const videos = source.videos;
  if (videos.length === 0) return null;
  if (mode === 'loop' && currentBvid) {
    return videos[findIndex(videos, currentBvid, currentPartNum)] ?? videos[0];
  }
  if (mode === 'shuffle') {
    return pickNext(source, currentBvid, mode, currentPartNum);
  }
  const idx = findIndex(videos, currentBvid, currentPartNum);
  const prevIdx = idx <= 0 ? videos.length - 1 : idx - 1;
  return videos[prevIdx];
}
