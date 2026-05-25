import type { Video } from '../shared/types';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PAGE_SIZE = 30;

export type SeasonData = {
  name: string;
  videos: Video[];
};

type Fetcher = (url: string, options: any) => Promise<Response>;

type ApiResponse = {
  code: number;
  message?: string;
  data?: {
    meta: { name: string; total: number; mid: number | string };
    archives: Array<{
      bvid: string;
      title: string;
      duration: number;
      pic: string;
    }>;
  };
};

/**
 * 拉取一个合集的所有视频。会自动分页直到拿到 meta.total 个。
 * 必须由主进程调用（net.fetch 走 Electron 网络栈，绕开 CORS）。
 */
export async function fetchSeasonArchives(
  mid: string,
  seasonId: string,
  fetcher: Fetcher
): Promise<SeasonData> {
  const referer = `https://space.bilibili.com/${mid}/lists/${seasonId}?type=season`;
  const headers = {
    'User-Agent': UA,
    'Referer': referer,
    'Origin': 'https://space.bilibili.com',
  };

  let name = '';
  const videos: Video[] = [];
  let page = 1;
  let total = Infinity;

  while (videos.length < total) {
    const url = `https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid=${mid}&season_id=${seasonId}&page_num=${page}&page_size=${PAGE_SIZE}`;
    const res = await fetcher(url, { headers });
    const json = (await res.json()) as ApiResponse;

    if (json.code !== 0 || !json.data) {
      throw new Error(`B 站 API 失败 (code=${json.code}): ${json.message ?? 'unknown'}`);
    }

    if (page === 1) {
      name = json.data.meta.name;
      total = json.data.meta.total;
    }

    for (const a of json.data.archives) {
      videos.push({
        bvid: a.bvid,
        title: a.title,
        duration: a.duration,
        cover: a.pic,
      });
    }

    if (json.data.archives.length < PAGE_SIZE) break;
    page++;
  }

  return { name, videos };
}
