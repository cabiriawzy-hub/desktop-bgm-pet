import { describe, it, expect } from 'vitest';
import { parseListURL } from './bilibili-url';

describe('parseListURL', () => {
  it('parses a season URL', () => {
    const url = 'https://space.bilibili.com/55491826/lists/3300721?type=season';
    expect(parseListURL(url)).toEqual({ mid: '55491826', listId: '3300721', listType: 'season' });
  });

  it('parses a series URL', () => {
    const url = 'https://space.bilibili.com/95262312/lists/1577680?type=series';
    expect(parseListURL(url)).toEqual({ mid: '95262312', listId: '1577680', listType: 'series' });
  });

  it('handles a 16-digit mid (new account)', () => {
    const url = 'https://space.bilibili.com/3690985372519123/lists/6971509?type=season';
    expect(parseListURL(url)).toEqual({ mid: '3690985372519123', listId: '6971509', listType: 'season' });
  });

  it('rejects URLs without type', () => {
    const url = 'https://space.bilibili.com/55491826/lists/3300721';
    expect(() => parseListURL(url)).toThrow(/type=season 或 type=series/);
  });

  it('rejects type=collect (个人收藏夹)', () => {
    const url = 'https://space.bilibili.com/55491826/lists/3300721?type=collect';
    expect(() => parseListURL(url)).toThrow(/不支持.*收藏夹/);
  });

  it('rejects non-bilibili URLs', () => {
    expect(() => parseListURL('https://example.com/foo')).toThrow(/B 站列表 URL/);
  });

  it('rejects garbage input', () => {
    expect(() => parseListURL('not a url')).toThrow(/B 站列表 URL/);
  });
});
