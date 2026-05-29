import { describe, it, expect, vi } from 'vitest';
import { pickNext, pickPrev } from './playback';
import type { Source } from '../shared/types';

const src: Source = {
  id: 's1', name: 't', mid: '1', seasonId: '1', lastFetched: 0, category: 'music',
  videos: [
    { bvid: 'a', title: 'A', cover: '', duration: 60 },
    { bvid: 'b', title: 'B', cover: '', duration: 60 },
    { bvid: 'c', title: 'C', cover: '', duration: 60 },
  ],
};

describe('pickNext', () => {
  it('sequential: a → b → c → a', () => {
    expect(pickNext(src, 'a', 'sequential')?.bvid).toBe('b');
    expect(pickNext(src, 'b', 'sequential')?.bvid).toBe('c');
    expect(pickNext(src, 'c', 'sequential')?.bvid).toBe('a');
  });
  it('loop: stays on current', () => {
    expect(pickNext(src, 'b', 'loop')?.bvid).toBe('b');
  });
  it('shuffle: never picks current', () => {
    // First random→0 picks 'a' (current, retry); next→0.5 picks 'b' and exits.
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.5);
    const next = pickNext(src, 'a', 'shuffle');
    expect(next?.bvid).not.toBe('a');
  });
});

describe('pickPrev', () => {
  it('sequential: a → c (wrap)', () => {
    expect(pickPrev(src, 'a', 'sequential')?.bvid).toBe('c');
    expect(pickPrev(src, 'b', 'sequential')?.bvid).toBe('a');
  });
});
