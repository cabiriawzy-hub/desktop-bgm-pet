export type ListType = 'season' | 'series';
export type ListRef = { mid: string; listId: string; listType: ListType };
// 老类型别名，保留兼容
export type SeasonRef = { mid: string; seasonId: string };

const PATH_RE = /^https?:\/\/space\.bilibili\.com\/(\d+)\/lists\/(\d+)\/?$/;

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

  if (url.hostname !== 'space.bilibili.com') {
    throw new Error('不是合法的 B 站列表 URL');
  }

  const m = PATH_RE.exec(`${url.protocol}//${url.host}${url.pathname}`);
  if (!m) {
    throw new Error('不是合法的 B 站列表 URL');
  }

  const type = url.searchParams.get('type');
  if (type === 'season') return { mid: m[1], listId: m[2], listType: 'season' };
  if (type === 'series') return { mid: m[1], listId: m[2], listType: 'series' };
  if (type === 'collect') {
    throw new Error('不支持「个人收藏夹」(type=collect)，请用 UP 主自己的合集或视频列表');
  }
  throw new Error('URL 缺少 type=season 或 type=series 参数');
}

/** @deprecated 用 parseListURL 替代 */
export function parseSeasonURL(input: string): SeasonRef {
  const ref = parseListURL(input);
  if (ref.listType !== 'season') {
    throw new Error('需要的是 type=season 的合集 URL');
  }
  return { mid: ref.mid, seasonId: ref.listId };
}
