export type SeasonRef = { mid: string; seasonId: string };

const SEASON_PATH_RE = /^https?:\/\/space\.bilibili\.com\/(\d+)\/lists\/(\d+)\/?$/;

/**
 * 解析 B 站 UP 主合集 URL。
 * 接受格式：https://space.bilibili.com/{mid}/lists/{season_id}?type=season
 * 只支持 type=season。type=collect / type=series 抛出明确错误。
 */
export function parseSeasonURL(input: string): SeasonRef {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('不是合法的 B 站合集 URL');
  }

  if (url.hostname !== 'space.bilibili.com') {
    throw new Error('不是合法的 B 站合集 URL');
  }

  const m = SEASON_PATH_RE.exec(`${url.protocol}//${url.host}${url.pathname}`);
  if (!m) {
    throw new Error('不是合法的 B 站合集 URL');
  }

  const type = url.searchParams.get('type');
  if (type !== 'season') {
    if (type === 'collect') {
      throw new Error('目前只支持 UP 主的「合集」，你贴的是「个人收藏夹」(type=collect)，请到 B 站打开合集页再复制 URL');
    }
    if (type === 'series') {
      throw new Error('目前只支持 UP 主的「合集」，你贴的是「视频列表」(type=series)，请到 B 站打开合集页再复制 URL');
    }
    throw new Error('URL 缺少 type=season 参数');
  }

  return { mid: m[1], seasonId: m[2] };
}
