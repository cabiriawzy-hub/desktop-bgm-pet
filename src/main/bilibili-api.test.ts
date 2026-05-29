import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSeasonArchives, fetchSeriesArchives, fetchListArchives } from './bilibili-api';

function mockJsonResponse(data: any) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(data),
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

describe('fetchVideoParts', () => {
  it('returns videos for each page of a multi-part video', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: {
        bvid: 'BV1Y7411n7iM',
        title: 'Improve Your English',
        pic: 'http://cover.jpg',
        owner: { mid: 123 },
        pages: [
          { cid: 11, page: 1, part: 'Improve Your English (1)', duration: 1398 },
          { cid: 12, page: 2, part: 'Improve Your English (2)', duration: 1399 },
          { cid: 13, page: 3, part: 'Improve Your English (3)', duration: 1402 },
        ],
      },
    }));

    const { fetchVideoParts } = await import('./bilibili-api');
    const result = await fetchVideoParts('BV1Y7411n7iM', mockFetch);

    expect(result.name).toBe('Improve Your English');
    expect(result.videos).toEqual([
      { bvid: 'BV1Y7411n7iM', title: 'Improve Your English (1)', duration: 1398, cover: 'http://cover.jpg', partNum: 1 },
      { bvid: 'BV1Y7411n7iM', title: 'Improve Your English (2)', duration: 1399, cover: 'http://cover.jpg', partNum: 2 },
      { bvid: 'BV1Y7411n7iM', title: 'Improve Your English (3)', duration: 1402, cover: 'http://cover.jpg', partNum: 3 },
    ]);
  });

  it('calls the correct endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: { bvid: 'BV', title: 't', pic: 'p', owner: { mid: 1 }, pages: [] },
    }));
    const { fetchVideoParts } = await import('./bilibili-api');
    await fetchVideoParts('BV1Y7411n7iM', mockFetch);
    expect(mockFetch.mock.calls[0][0]).toContain('/x/web-interface/view?bvid=BV1Y7411n7iM');
  });

  it('throws when B 站 returns error code', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({ code: -404, message: 'not found' }));
    const { fetchVideoParts } = await import('./bilibili-api');
    await expect(fetchVideoParts('BV', mockFetch)).rejects.toThrow(/-404/);
  });
});

describe('parseMmSs', () => {
  it('parses mm:ss', async () => {
    const { parseMmSs } = await import('./bilibili-api');
    expect(parseMmSs('23:18')).toBe(23 * 60 + 18);
    expect(parseMmSs('0:30')).toBe(30);
  });

  it('parses h:mm:ss', async () => {
    const { parseMmSs } = await import('./bilibili-api');
    expect(parseMmSs('1:02:33')).toBe(3600 + 2 * 60 + 33);
  });

  it('returns 0 for malformed input', async () => {
    const { parseMmSs } = await import('./bilibili-api');
    expect(parseMmSs('')).toBe(0);
    expect(parseMmSs('abc')).toBe(0);
  });
});

describe('fetchUserUploads', () => {
  // 每个 test 开头重置 wbi 缓存,避免上一个 test 的 fetch 留下的 cache 干扰
  beforeEach(async () => {
    const { _resetWbiCache } = await import('./bilibili-api');
    _resetWbiCache();
  });

  it('returns parsed videos on success', async () => {
    const mockFetch = vi.fn()
      // 1. nav (for wbi keys)
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: { wbi_img: { img_url: 'https://x/aaa.png', sub_url: 'https://x/bbb.png' } },
      }))
      // 2. finger/spi (for buvid3)
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: { b_3: 'fake-buvid3-token', b_4: 'fake-buvid4-token' },
      }))
      // 3. actual signed arc/search
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: {
          list: {
            vlist: [
              { bvid: 'BV1aaa', title: '永远保持积极乐观的心态', length: '00:18', pic: 'http://p1' },
              { bvid: 'BV1bbb', title: '想要找到心爱之人', length: '00:48', pic: 'http://p2' },
            ],
          },
          page: { pn: 1, ps: 30, count: 2 },
        },
      }));

    const { fetchUserUploads } = await import('./bilibili-api');
    const result = await fetchUserUploads('3691000482499314', mockFetch);

    // calls: [0]=nav, [1]=finger/spi, [2]=arc/search
    expect(mockFetch.mock.calls[0][0]).toContain('/x/web-interface/nav');
    expect(mockFetch.mock.calls[2][0]).toContain('space/wbi/arc/search');
    expect(mockFetch.mock.calls[2][1].headers['Cookie']).toContain('buvid3=fake-buvid3-token');
    expect(result.videos).toEqual([
      { bvid: 'BV1aaa', title: '永远保持积极乐观的心态', duration: 18, cover: 'http://p1' },
      { bvid: 'BV1bbb', title: '想要找到心爱之人', duration: 48, cover: 'http://p2' },
    ]);
    expect(result.name).toContain('3691000482499314');
  });

  it('paginates until count is reached', async () => {
    const page1 = {
      list: {
        vlist: Array.from({ length: 30 }, (_, i) => ({
          bvid: `BV${i}`, title: `t${i}`, length: '01:00', pic: 'p',
        })),
      },
      page: { pn: 1, ps: 30, count: 35 },
    };
    const page2 = {
      list: {
        vlist: Array.from({ length: 5 }, (_, i) => ({
          bvid: `BV${30 + i}`, title: `t${30 + i}`, length: '01:00', pic: 'p',
        })),
      },
      page: { pn: 2, ps: 30, count: 35 },
    };
    const mockFetch = vi.fn()
      // nav mock
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: { wbi_img: { img_url: 'https://x/aaa.png', sub_url: 'https://x/bbb.png' } },
      }))
      // finger/spi mock
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: { b_3: 'fake-buvid3-token', b_4: 'fake-buvid4-token' },
      }))
      .mockResolvedValueOnce(mockJsonResponse({ code: 0, data: page1 }))
      .mockResolvedValueOnce(mockJsonResponse({ code: 0, data: page2 }));

    const { fetchUserUploads } = await import('./bilibili-api');
    const result = await fetchUserUploads('1', mockFetch);

    // nav + finger/spi + 2 arc/search pages = 4 calls total
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(result.videos).toHaveLength(35);
  });

  it('throws when B 站 returns risk-control code', async () => {
    const mockFetch = vi.fn()
      // nav mock
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: { wbi_img: { img_url: 'https://x/aaa.png', sub_url: 'https://x/bbb.png' } },
      }))
      // finger/spi mock
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: { b_3: 'fake-buvid3-token', b_4: 'fake-buvid4-token' },
      }))
      .mockResolvedValueOnce(mockJsonResponse({ code: -799, message: 'risk control' }));
    const { fetchUserUploads } = await import('./bilibili-api');
    await expect(fetchUserUploads('1', mockFetch)).rejects.toThrow(/-799/);
  });

  it('throws when finger/spi returns no b_3', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({
        code: 0,
        data: { wbi_img: { img_url: 'https://x/a.png', sub_url: 'https://x/b.png' } },
      }))
      .mockResolvedValueOnce(mockJsonResponse({ code: -101, message: 'unauthorized' }));
    const { fetchUserUploads } = await import('./bilibili-api');
    await expect(fetchUserUploads('1', mockFetch)).rejects.toThrow(/finger\/spi/);
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

  it('rejects listType=uploads with a friendly error', async () => {
    const mockFetch = vi.fn();  // 不应该被调到
    await expect(
      fetchListArchives('3691000482499314', '3691000482499314', 'uploads', mockFetch)
    ).rejects.toThrow(/UP 主投稿暂不支持/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('routes listType=parts to web-interface/view', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: { bvid: 'BV', title: 't', pic: 'p', owner: { mid: 1 }, pages: [] },
    }));
    await fetchListArchives('', 'BV1Y7411n7iM', 'parts', mockFetch);
    expect(mockFetch.mock.calls[0][0]).toContain('web-interface/view?bvid=BV1Y7411n7iM');
  });
});
