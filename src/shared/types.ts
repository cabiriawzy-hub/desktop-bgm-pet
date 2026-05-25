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
  name: string;         // 合集名（从 B 站 API meta.name）
  mid: string;          // UP 主 uid（用 string，B 站新号 mid 超过 JS 安全整数）
  seasonId: string;
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
  windowState: WindowState;
};

export const DEFAULT_CONFIG: Config = {
  sources: [],
  currentSourceId: null,
  currentBvid: null,
  playMode: 'sequential',
  muted: false,
  petEmoji: '🪩',
  windowState: {
    mode: 'folded',
    petPos: { x: -1, y: -1 },    // -1 表示"未设置"，启动时归位到屏幕中心
    petSize: 80,
    playerPos: { x: -1, y: -1 },
    playerSize: { w: 360, h: 240 },
  },
};
