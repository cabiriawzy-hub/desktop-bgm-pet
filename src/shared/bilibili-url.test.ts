import { describe, it, expect } from 'vitest';
import { parseSeasonURL } from './bilibili-url';

describe('parseSeasonURL', () => {
  it('parses a standard season URL', () => {
    const url = 'https://space.bilibili.com/55491826/lists/3300721?type=season';
    expect(parseSeasonURL(url)).toEqual({ mid: '55491826', seasonId: '3300721' });
  });

  it('handles a 16-digit mid (new account)', () => {
    const url = 'https://space.bilibili.com/3690985372519123/lists/6971509?type=season';
    expect(parseSeasonURL(url)).toEqual({ mid: '3690985372519123', seasonId: '6971509' });
  });

  it('rejects URLs without type=season', () => {
    const url = 'https://space.bilibili.com/55491826/lists/3300721';
    expect(() => parseSeasonURL(url)).toThrow(/type=season/);
  });

  it('rejects type=collect (个人收藏夹)', () => {
    const url = 'https://space.bilibili.com/55491826/lists/3300721?type=collect';
    expect(() => parseSeasonURL(url)).toThrow(/只支持.*合集/);
  });

  it('rejects type=series (UP 视频列表)', () => {
    const url = 'https://space.bilibili.com/55491826/lists/3300721?type=series';
    expect(() => parseSeasonURL(url)).toThrow(/只支持.*合集/);
  });

  it('rejects non-bilibili URLs', () => {
    expect(() => parseSeasonURL('https://example.com/foo')).toThrow(/B 站合集 URL/);
  });

  it('rejects garbage input', () => {
    expect(() => parseSeasonURL('not a url')).toThrow(/B 站合集 URL/);
  });
});
