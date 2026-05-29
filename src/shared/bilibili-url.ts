export type ListType = 'season' | 'series' | 'uploads' | 'parts';
export type ListRef = { mid: string; listId: string; listType: ListType };
// 老类型别名，保留兼容
export type SeasonRef = { mid: string; seasonId: string };

const LISTS_PATH_RE = /^\/(\d+)\/lists\/(\d+)\/?$/;
const UPLOADS_PATH_RE = /^\/(\d+)(?:\/.*)?$/;
const VIDEO_PATH_RE = /^\/video\/(BV[0-9A-Za-z]+)\/?$/;

/**
 * 解析 B 站 UP 主列表 URL。
 * 接受两种：
 *   https://space.bilibili.com/{mid}/lists/{season_id}?type=season  → 合集
 *   https://space.bilibili.com/{mid}/lists/{series_id}?type=series  → 视频列表
 * 拒绝 type=collect（个人收藏夹）和其他类型。
 */
export function parseListURL(input: string): ListRef {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('不是合法的 B 站列表 URL');
  }

  if (url.hostname === 'space.bilibili.com') {
    // 优先匹配 /lists/{id} 形式(合集 / 视频列表)
    const listsMatch = LISTS_PATH_RE.exec(url.pathname);
    if (listsMatch) {
      const [, mid, listId] = listsMatch;
      const type = url.searchParams.get('type');
      if (type === 'season') return { mid, listId, listType: 'season' };
      if (type === 'series') return { mid, listId, listType: 'series' };
      if (type === 'collect') {
        throw new Error('不支持「个人收藏夹」(type=collect)，请用 UP 主自己的合集或视频列表');
      }
      throw new Error('URL 缺少 type=season 或 type=series 参数');
    }
    // 退化为裸 UP 主主页(可带任意子路径如 /video, /dynamic, /upload/video)
    const uploadsMatch = UPLOADS_PATH_RE.exec(url.pathname);
    if (uploadsMatch) {
      const mid = uploadsMatch[1];
      return { mid, listId: mid, listType: 'uploads' };
    }
  }

  if (url.hostname === 'www.bilibili.com' || url.hostname === 'bilibili.com') {
    const partsMatch = VIDEO_PATH_RE.exec(url.pathname);
    if (partsMatch) {
      return { mid: '', listId: partsMatch[1], listType: 'parts' };
    }
  }

  throw new Error('不是合法的 B 站列表 URL');
}

/** @deprecated 用 parseListURL 替代 */
export function parseSeasonURL(input: string): SeasonRef {
  const ref = parseListURL(input);
  if (ref.listType !== 'season') {
    throw new Error('需要的是 type=season 的合集 URL');
  }
  return { mid: ref.mid, seasonId: ref.listId };
}
