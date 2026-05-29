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
    expect(pickNext(src, 'a', 'sequential', null)?.bvid).toBe('b');
    expect(pickNext(src, 'b', 'sequential', null)?.bvid).toBe('c');
    expect(pickNext(src, 'c', 'sequential', null)?.bvid).toBe('a');
  });
  it('loop: stays on current', () => {
    expect(pickNext(src, 'b', 'loop', null)?.bvid).toBe('b');
  });
  it('shuffle: never picks current', () => {
    // First random→0 picks 'a' (current, retry); next→0.5 picks 'b' and exits.
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.5);
    const next = pickNext(src, 'a', 'shuffle', null);
    expect(next?.bvid).not.toBe('a');
  });
});

describe('pickPrev', () => {
  it('sequential: a → c (wrap)', () => {
    expect(pickPrev(src, 'a', 'sequential', null)?.bvid).toBe('c');
    expect(pickPrev(src, 'b', 'sequential', null)?.bvid).toBe('a');
  });
});

describe('pickNext (parts source)', () => {
  const partsSrc: Source = {
    id: 'sp', name: 'Improve Your English', mid: '', seasonId: 'BV1Y7411n7iM',
    listType: 'parts', category: 'learning', lastFetched: 0,
    videos: [
      { bvid: 'BV1Y7411n7iM', title: '(1)', cover: '', duration: 1398, partNum: 1 },
      { bvid: 'BV1Y7411n7iM', title: '(2)', cover: '', duration: 1399, partNum: 2 },
      { bvid: 'BV1Y7411n7iM', title: '(3)', cover: '', duration: 1402, partNum: 3 },
    ],
  };

  it('sequential: part 1 → 2 → 3 → 1', () => {
    expect(pickNext(partsSrc, 'BV1Y7411n7iM', 'sequential', 1)?.partNum).toBe(2);
    expect(pickNext(partsSrc, 'BV1Y7411n7iM', 'sequential', 2)?.partNum).toBe(3);
    expect(pickNext(partsSrc, 'BV1Y7411n7iM', 'sequential', 3)?.partNum).toBe(1);
  });

  it('loop: stays on current part', () => {
    expect(pickNext(partsSrc, 'BV1Y7411n7iM', 'loop', 2)?.partNum).toBe(2);
  });

  it('shuffle: never picks current part', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.5);
    const next = pickNext(partsSrc, 'BV1Y7411n7iM', 'shuffle', 1);
    expect(next?.partNum).not.toBe(1);
  });
});

describe('pickPrev (parts source)', () => {
  const partsSrc: Source = {
    id: 'sp', name: 'IYE', mid: '', seasonId: 'BV', listType: 'parts', category: 'learning', lastFetched: 0,
    videos: [
      { bvid: 'BV', title: '(1)', cover: '', duration: 60, partNum: 1 },
      { bvid: 'BV', title: '(2)', cover: '', duration: 60, partNum: 2 },
      { bvid: 'BV', title: '(3)', cover: '', duration: 60, partNum: 3 },
    ],
  };

  it('sequential: part 1 → 3 (wrap)', () => {
    expect(pickPrev(partsSrc, 'BV', 'sequential', 1)?.partNum).toBe(3);
    expect(pickPrev(partsSrc, 'BV', 'sequential', 2)?.partNum).toBe(1);
  });
});
