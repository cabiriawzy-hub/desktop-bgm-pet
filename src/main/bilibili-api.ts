import type { Video } from '../shared/types';
import type { ListType } from '../shared/bilibili-url';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PAGE_SIZE = 30;

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

/** 多态：根据 listType 路由到对应的实现。 */
export function fetchListArchives(
  mid: string,
  listId: string,
  listType: ListType,
  fetcher: Fetcher
): Promise<ListData> {
  return listType === 'series'
    ? fetchSeriesArchives(mid, listId, fetcher)
    : fetchSeasonArchives(mid, listId, fetcher);
}
