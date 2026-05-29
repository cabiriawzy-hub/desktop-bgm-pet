// src/shared/types.ts

export type PlayMode = 'sequential' | 'shuffle' | 'loop';

/** Source 分类:决定它在 SourceMenu 里属于哪一组。播放行为两类相同。 */
export type Category = 'music' | 'learning';

/** Source 的 listType。
 *   season:  UP 主合集 (seasons_archives_list)
 *   series:  UP 主视频列表 (series/archives)
 *   uploads: UP 主全部投稿 (space/arc/search)        ← 新增
 *   parts:   单个视频的分P (web-interface/view.pages) ← 新增
 */
export type ListType = 'season' | 'series' | 'uploads' | 'parts';

export type Video = {
  bvid: string;
  title: string;
  cover: string;        // 封面 URL
  duration: number;     // 秒
  /** 1-indexed,仅 listType='parts' 下使用。同 source 内多个 Video 共享 bvid,partNum 区分。 */
  partNum?: number;
};

export type Source = {
  id: string;           // uuid
  name: string;         // 列表名
  mid: string;          // UP 主 mid;listType='parts' 下未必有意义,可为空字符串
  // 列表 ID。装的内容随 listType 变:
  //   season  -> season_id
  //   series  -> series_id
  //   uploads -> 用户 mid(冗余存一份,方便 fetcher 找参数)
  //   parts   -> bvid
  // 字段名沿用历史,改名会破老 config。
  seasonId: string;
  // 老 config 没这个字段,按 'season' 处理
  listType?: ListType;
  /** 新增:Source 分类。老 config 没有这字段,migration 时默认 'music'。 */
  category: Category;
  videos: Video[];
  lastFetched: number;  // unix ms
};

export type WindowState = {
  mode: 'folded' | 'expanded';
  petPos: { x: number; y: number };
  petSize: number;
  playerPos: { x: number; y: number };
  playerSize: { w: number; h: number };
};

export type Config = {
  sources: Source[];
  currentSourceId: string | null;
  currentBvid: string | null;
  /** 新增:当 currentBvid 指向一个 parts 类型 source 里的某 part 时,记录是第几 part。
   *  非 parts 视频下为 null。 */
  currentPartNum: number | null;
  playMode: PlayMode;
  muted: boolean;
  petEmoji: string;
  /** 视频画面透明度 0..1,0.2 = 几乎全透明,1 = 完全不透明 */
  playerOpacity: number;
  windowState: WindowState;
};

export const DEFAULT_CONFIG: Config = {
  sources: [],
  currentSourceId: null,
  currentBvid: null,
  currentPartNum: null,
  playMode: 'sequential',
  muted: false,
  petEmoji: '🪩',
  playerOpacity: 0.5,
  windowState: {
    mode: 'folded',
    petPos: { x: -1, y: -1 },    // -1 表示"未设置"，启动时归位到屏幕中心
    petSize: 80,
    playerPos: { x: -1, y: -1 },
    playerSize: { w: 360, h: 240 },
  },
};
