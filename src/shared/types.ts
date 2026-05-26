// src/shared/types.ts

export type PlayMode = 'sequential' | 'shuffle' | 'loop';

export type Video = {
  bvid: string;
  title: string;
  cover: string;        // 封面 URL
  duration: number;     // 秒
};

export type Source = {
  id: string;           // uuid
  name: string;         // 列表名（从 B 站 API meta.name）
  mid: string;          // UP 主 uid（用 string，B 站新号 mid 超过 JS 安全整数）
  // 列表 ID。listType='season' 时是 season_id，listType='series' 时是 series_id。
  // 字段名沿用历史，没改成 listId 是为了不破坏老 config。
  seasonId: string;
  // 老 config 没这个字段，按 'season' 处理
  listType?: 'season' | 'series';
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
  playMode: PlayMode;
  muted: boolean;
  petEmoji: string;
  /** 视频画面透明度 0..1，0.2 = 几乎全透明，1 = 完全不透明 */
  playerOpacity: number;
  windowState: WindowState;
};

export const DEFAULT_CONFIG: Config = {
  sources: [],
  currentSourceId: null,
  currentBvid: null,
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
