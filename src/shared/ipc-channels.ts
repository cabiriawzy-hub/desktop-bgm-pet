// src/shared/ipc-channels.ts
export const IPC = {
  GetConfig: 'config:get',
  AddSource: 'source:add',
  RemoveSource: 'source:remove',
  RefreshSource: 'source:refresh',
  SetCurrent: 'playback:set-current',
  SetPlayMode: 'playback:set-mode',
  SetMuted: 'playback:set-muted',
  SetEmoji: 'pet:set-emoji',
  SetWindowMode: 'window:set-mode',
  UpdateWindowGeometry: 'window:update-geometry',
  Quit: 'app:quit',
} as const;

export type AddSourcePayload = { url: string };
export type RemoveSourcePayload = { id: string };
export type RefreshSourcePayload = { id: string };
export type SetCurrentPayload = { sourceId: string; bvid: string };
export type SetPlayModePayload = { mode: 'sequential' | 'shuffle' | 'loop' };
export type SetMutedPayload = { muted: boolean };
export type SetEmojiPayload = { emoji: string };
export type SetWindowModePayload = { mode: 'folded' | 'expanded' };
export type UpdateWindowGeometryPayload = {
  petPos?: { x: number; y: number };
  petSize?: number;
  playerPos?: { x: number; y: number };
  playerSize?: { w: number; h: number };
};
