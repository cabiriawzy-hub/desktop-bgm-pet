import { describe, it, expect, vi } from 'vitest';
import { fetchSeasonArchives, fetchSeriesArchives, fetchListArchives } from './bilibili-api';

function mockJsonResponse(data: any) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  } as unknown as Response;
}

describe('fetchSeasonArchives', () => {
  it('returns parsed videos on success', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: {
        meta: { name: '测试合集', total: 2, mid: 55491826 },
        archives: [
          { bvid: 'BV1aaa', title: '第一首', duration: 180, pic: 'http://pic1' },
          { bvid: 'BV1bbb', title: '第二首', duration: 240, pic: 'http://pic2' },
        ],
      },
    }));

    const result = await fetchSeasonArchives('55491826', '3300721', mockFetch);

    expect(result.name).toBe('测试合集');
    expect(result.videos).toEqual([
      { bvid: 'BV1aaa', title: '第一首', duration: 180, cover: 'http://pic1' },
      { bvid: 'BV1bbb', title: '第二首', duration: 240, cover: 'http://pic2' },
    ]);
  });

  it('paginates until total is reached', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: {
          meta: { name: '大合集', total: 35, mid: 1 },
          archives: Array.from({ length: 30 }, (_, i) => ({
            bvid: `BV${i}`, title: `t${i}`, duration: 60, pic: 'p',
          })),
        },
      }))
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: {
          meta: { name: '大合集', total: 35, mid: 1 },
          archives: Array.from({ length: 5 }, (_, i) => ({
            bvid: `BV${30 + i}`, title: `t${30 + i}`, duration: 60, pic: 'p',
          })),
        },
      }));

    const result = await fetchSeasonArchives('1', '2', mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.videos).toHaveLength(35);
    expect(result.videos[34].bvid).toBe('BV34');
  });

  it('throws on B 站 风控 code', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: -352, message: '风控',
    }));

    await expect(fetchSeasonArchives('1', '2', mockFetch)).rejects.toThrow(/-352/);
  });

  it('sends required headers (UA, Referer, Origin)', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: { meta: { name: 'x', total: 0, mid: 1 }, archives: [] },
    }));

    await fetchSeasonArchives('55491826', '3300721', mockFetch);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['User-Agent']).toMatch(/Mozilla/);
    expect(options.headers['Referer']).toContain('space.bilibili.com/55491826/lists/3300721');
    expect(options.headers['Origin']).toBe('https://space.bilibili.com');
  });
});

describe('fetchSeriesArchives', () => {
  it('returns parsed videos using both /series/series (meta) and /series/archives', async () => {
    const mockFetch = vi.fn()
      // 第一次：series/series 拿 name
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: { meta: { name: 'NZ 白噪音', total: 2, mid: 95262312 } },
      }))
      // 第二次：series/archives 拿 videos
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: {
          page: { num: 1, size: 30, total: 2 },
          archives: [
            { bvid: 'BV1xxx', title: '雨夜白噪音', duration: 600, pic: 'http://p1' },
            { bvid: 'BV1yyy', title: '冬日大提琴', duration: 720, pic: 'http://p2' },
          ],
        },
      }));

    const result = await fetchSeriesArchives('95262312', '1577680', mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toContain('series/series');
    expect(mockFetch.mock.calls[1][0]).toContain('series/archives');
    expect(result.name).toBe('NZ 白噪音');
    expect(result.videos).toEqual([
      { bvid: 'BV1xxx', title: '雨夜白噪音', duration: 600, cover: 'http://p1' },
      { bvid: 'BV1yyy', title: '冬日大提琴', duration: 720, cover: 'http://p2' },
    ]);
  });

  it('throws if series meta fails', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({ code: -404, message: 'not found' }));
    await expect(fetchSeriesArchives('1', '2', mockFetch)).rejects.toThrow(/series meta/);
  });
});

describe('fetchListArchives (dispatch)', () => {
  it('routes listType=season to season endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: { meta: { name: 's', total: 0, mid: 1 }, archives: [] },
    }));
    await fetchListArchives('1', '2', 'season', mockFetch);
    expect(mockFetch.mock.calls[0][0]).toContain('seasons_archives_list');
  });

  it('routes listType=series to series endpoints', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0, data: { meta: { name: 'x', total: 0, mid: 1 } },
      }))
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0, data: { page: { num: 1, size: 30, total: 0 }, archives: [] },
      }));
    await fetchListArchives('1', '2', 'series', mockFetch);
    expect(mockFetch.mock.calls[0][0]).toContain('series/series');
    expect(mockFetch.mock.calls[1][0]).toContain('series/archives');
  });
});
