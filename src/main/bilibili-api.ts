import type { Video } from '../shared/types';
import type { ListType } from '../shared/bilibili-url';
import { fetchWbiKeys, getMixinKey, signQuery } from './wbi';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PAGE_SIZE = 30;

// 进程级缓存:wbi mixin key 短期内不变,避免每次 fetchUserUploads 都打 nav 一次。
// 测试时通过 _resetWbiCache() 重置。
let cachedMixinKey: string | null = null;
export function _resetWbiCache() { cachedMixinKey = null; }

async function getCachedMixinKey(fetcher: Fetcher): Promise<string> {
  if (!cachedMixinKey) {
    const { imgKey, subKey } = await fetchWbiKeys(fetcher);
    cachedMixinKey = getMixinKey(imgKey + subKey);
  }
  return cachedMixinKey;
}

export type ListData = {
  name: string;
  videos: Video[];
};

type Fetcher = (url: string, options: any) => Promise<Response>;

function headersFor(mid: string, listId: string, listType: ListType) {
  return {
    'User-Agent': UA,
    'Referer': `https://space.bilibili.com/${mid}/lists/${listId}?type=${listType}`,
    'Origin': 'https://space.bilibili.com',
  };
}

type SeasonResponse = {
  code: number;
  message?: string;
  data?: {
    meta: { name: string; total: number; mid: number | string };
    archives: Array<{ bvid: string; title: string; duration: number; pic: string }>;
  };
};

type SeriesArchivesResponse = {
  code: number;
  message?: string;
  data?: {
    page: { num: number; size: number; total: number };
    archives: Array<{ bvid: string; title: string; duration: number; pic: string }>;
  };
};

type SeriesMetaResponse = {
  code: number;
  message?: string;
  data?: {
    meta: { name: string; total: number; mid: number | string };
  };
};

/**
 * 拉取一个合集（season）的所有视频。
 */
export async function fetchSeasonArchives(
  mid: string,
  seasonId: string,
  fetcher: Fetcher
): Promise<ListData> {
  const headers = headersFor(mid, seasonId, 'season');
  let name = '';
  const videos: Video[] = [];
  let page = 1;
  let total = Infinity;

  while (videos.length < total) {
    const url = `https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid=${mid}&season_id=${seasonId}&page_num=${page}&page_size=${PAGE_SIZE}`;
    const res = await fetcher(url, { headers });
    const json = (await res.json()) as SeasonResponse;

    if (json.code !== 0 || !json.data) {
      throw new Error(`B 站合集 API 失败 (code=${json.code}): ${json.message ?? 'unknown'}`);
    }

    if (page === 1) {
      name = json.data.meta.name;
      total = json.data.meta.total;
    }

    for (const a of json.data.archives) {
      videos.push({ bvid: a.bvid, title: a.title, duration: a.duration, cover: a.pic });
    }

    if (json.data.archives.length < PAGE_SIZE) break;
    page++;
  }

  return { name, videos };
}

/**
 * 拉取一个视频列表（series）的所有视频。
 * Series 的 name 在另一个接口里，要单独请求。
 */
export async function fetchSeriesArchives(
  mid: string,
  seriesId: string,
  fetcher: Fetcher
): Promise<ListData> {
  const headers = headersFor(mid, seriesId, 'series');

  // 1) 先拉 series meta 拿名字
  const metaRes = await fetcher(`https://api.bilibili.com/x/series/series?series_id=${seriesId}`, { headers });
  const metaJson = (await metaRes.json()) as SeriesMetaResponse;
  if (metaJson.code !== 0 || !metaJson.data) {
    throw new Error(`B 站 series meta 失败 (code=${metaJson.code}): ${metaJson.message ?? 'unknown'}`);
  }
  const name = metaJson.data.meta.name;

  // 2) 分页拉视频
  const videos: Video[] = [];
  let page = 1;
  let total = Infinity;

  while (videos.length < total) {
    const url = `https://api.bilibili.com/x/series/archives?mid=${mid}&series_id=${seriesId}&only_normal=true&sort=desc&pn=${page}&ps=${PAGE_SIZE}`;
    const res = await fetcher(url, { headers });
    const json = (await res.json()) as SeriesArchivesResponse;

    if (json.code !== 0 || !json.data) {
      throw new Error(`B 站 series archives 失败 (code=${json.code}): ${json.message ?? 'unknown'}`);
    }

    if (page === 1) {
      total = json.data.page?.total ?? json.data.archives.length;
    }

    for (const a of json.data.archives) {
      videos.push({ bvid: a.bvid, title: a.title, duration: a.duration, cover: a.pic });
    }

    if (json.data.archives.length < PAGE_SIZE) break;
    page++;
  }

  return { name, videos };
}

type VideoViewResponse = {
  code: number;
  message?: string;
  data?: {
    bvid: string;
    title: string;
    pic: string;
    owner: { mid: number | string };
    pages: Array<{ cid: number; page: number; part: string; duration: number }>;
  };
};

/**
 * 拉取一个视频的全部分P。单次请求,不分页。
 * 主标题作为 source name;每个分P 作为一条 Video,共享 bvid,partNum 区分。
 */
export async function fetchVideoParts(bvid: string, fetcher: Fetcher): Promise<ListData> {
  const headers = {
    'User-Agent': UA,
    'Referer': `https://www.bilibili.com/video/${bvid}/`,
    'Origin': 'https://www.bilibili.com',
  };

  const url = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
  const res = await fetcher(url, { headers });
  const json = (await res.json()) as VideoViewResponse;

  if (json.code !== 0 || !json.data) {
    throw new Error(`B 站视频信息 API 失败 (code=${json.code}): ${json.message ?? 'unknown'}`);
  }

  const videos: Video[] = json.data.pages.map(p => ({
    bvid: json.data!.bvid,
    title: p.part,
    duration: p.duration,
    cover: json.data!.pic,
    partNum: p.page,
  }));

  return { name: json.data.title, videos };
}

/**
 * 把 B 站投稿列表里的时长字符串("mm:ss" 或 "h:mm:ss")解析成秒。
 * 容错:格式不对就返回 0,不抛错。
 */
export function parseMmSs(s: string): number {
  if (!s) return 0;
  const parts = s.split(':');
  if (parts.length === 2) {
    const [m, ss] = parts.map(p => parseInt(p, 10));
    if (isFinite(m) && isFinite(ss)) return m * 60 + ss;
    return 0;
  }
  if (parts.length === 3) {
    const [h, m, ss] = parts.map(p => parseInt(p, 10));
    if (isFinite(h) && isFinite(m) && isFinite(ss)) return h * 3600 + m * 60 + ss;
    return 0;
  }
  return 0;
}

type SpaceArcSearchResponse = {
  code: number;
  message?: string;
  data?: {
    list: {
      vlist: Array<{ bvid: string; title: string; length: string; pic: string }>;
    };
    page: { pn: number; ps: number; count: number };
  };
};

/**
 * 拉取 UP 主全部投稿。用 wbi 签名版 x/space/wbi/arc/search 端点。
 * 不签名版会被 -799 风控拦。
 */
export async function fetchUserUploads(mid: string, fetcher: Fetcher): Promise<ListData> {
  const mixinKey = await getCachedMixinKey(fetcher);

  const headers = {
    'User-Agent': UA,
    'Referer': `https://space.bilibili.com/${mid}`,
    'Origin': 'https://space.bilibili.com',
  };

  const videos: Video[] = [];
  let page = 1;
  let total = Infinity;

  while (videos.length < total) {
    const query = signQuery(
      { mid, pn: page, ps: PAGE_SIZE, order: 'pubdate' },
      mixinKey,
    );
    const url = `https://api.bilibili.com/x/space/wbi/arc/search?${query}`;
    const res = await fetcher(url, { headers });
    const json = (await res.json()) as SpaceArcSearchResponse;

    if (json.code !== 0 || !json.data) {
      throw new Error(`B 站投稿 API 失败 (code=${json.code}): ${json.message ?? 'unknown'}`);
    }

    if (page === 1) {
      total = json.data.page.count;
    }

    for (const v of json.data.list.vlist) {
      videos.push({
        bvid: v.bvid,
        title: v.title,
        duration: parseMmSs(v.length),
        cover: v.pic,
      });
    }

    if (json.data.list.vlist.length < PAGE_SIZE) break;
    page++;
  }

  // 不签名的端点不返 UP 主名,签名版同样不返,用 mid 兜底
  return { name: `TA的视频 · UP-${mid}`, videos };
}

/** 多态:根据 listType 路由到对应的实现。 */
export function fetchListArchives(
  mid: string,
  listId: string,
  listType: ListType,
  fetcher: Fetcher
): Promise<ListData> {
  switch (listType) {
    case 'series':  return fetchSeriesArchives(mid, listId, fetcher);
    case 'uploads': return fetchUserUploads(mid, fetcher);
    case 'parts':   return fetchVideoParts(listId, fetcher);
    case 'season':
    default:        return fetchSeasonArchives(mid, listId, fetcher);
  }
}
