import { describe, it, expect } from 'vitest';
import { normalizeConfig, normalizeSource } from './store';

describe('normalizeSource', () => {
  it('defaults missing category to music', () => {
    const legacy = {
      id: 's1', name: 'foo', mid: '1', seasonId: '2',
      videos: [], lastFetched: 0,
    };
    expect(normalizeSource(legacy).category).toBe('music');
  });

  it('defaults missing listType to season', () => {
    const legacy = {
      id: 's1', name: 'foo', mid: '1', seasonId: '2',
      videos: [], lastFetched: 0,
    };
    expect(normalizeSource(legacy).listType).toBe('season');
  });

  it('preserves explicit category', () => {
    const src = {
      id: 's1', name: 'foo', mid: '1', seasonId: '2',
      category: 'learning' as const,
      videos: [], lastFetched: 0,
    };
    expect(normalizeSource(src).category).toBe('learning');
  });
});

describe('normalizeConfig', () => {
  it('normalizes every source', () => {
    const legacy = {
      sources: [
        { id: 's1', name: 'a', mid: '1', seasonId: '2', videos: [], lastFetched: 0 },
        { id: 's2', name: 'b', mid: '3', seasonId: '4', videos: [], lastFetched: 0 },
      ],
      currentSourceId: null,
      currentBvid: null,
      playMode: 'sequential',
      muted: false,
      petEmoji: '🪩',
      playerOpacity: 0.5,
      windowState: {
        mode: 'folded', petPos: { x: 0, y: 0 }, petSize: 80,
        playerPos: { x: 0, y: 0 }, playerSize: { w: 360, h: 240 },
      },
    };
    const result = normalizeConfig(legacy);
    expect(result.sources[0].category).toBe('music');
    expect(result.sources[1].category).toBe('music');
  });

  it('defaults missing currentPartNum to null', () => {
    const legacy = { sources: [] } as any;
    expect(normalizeConfig(legacy).currentPartNum).toBe(null);
  });
});
