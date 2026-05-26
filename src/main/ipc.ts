// src/main/ipc.ts
import { ipcMain, app } from 'electron';
import { randomUUID } from 'crypto';
import { IPC } from '../shared/ipc-channels';
import type {
  AddSourcePayload, RemoveSourcePayload, RefreshSourcePayload,
  SetCurrentPayload, SetPlayModePayload, SetMutedPayload, SetEmojiPayload,
  SetWindowModePayload, UpdateWindowGeometryPayload,
} from '../shared/ipc-channels';
import { getConfig, setConfig } from './store';
import { parseListURL } from '../shared/bilibili-url';
import { fetchListArchives } from './bilibili-api';

export function registerIpcHandlers(opts: {
  onSetWindowMode: (mode: 'folded' | 'expanded') => void;
  onUpdateGeometry: (p: UpdateWindowGeometryPayload) => void;
  onSetMuted: (muted: boolean) => void;
}) {
  ipcMain.handle(IPC.GetConfig, () => getConfig());

  ipcMain.handle(IPC.AddSource, async (_e, { url }: AddSourcePayload) => {
    const { mid, listId, listType } = parseListURL(url);
    const data = await fetchListArchives(mid, listId, listType, fetch);
    return setConfig(cfg => {
      const newSource = {
        id: randomUUID(),
        name: data.name,
        mid,
        seasonId: listId,  // 字段名沿用历史，对 series 来说装的是 series_id
        listType,
        videos: data.videos,
        lastFetched: Date.now(),
      };
      const sources = [...cfg.sources, newSource];
      // 第一次添加 → 自动选中第一首
      const currentSourceId = cfg.currentSourceId ?? newSource.id;
      const currentBvid = cfg.currentBvid ?? (newSource.videos[0]?.bvid ?? null);
      return { ...cfg, sources, currentSourceId, currentBvid };
    });
  });

  ipcMain.handle(IPC.RemoveSource, (_e, { id }: RemoveSourcePayload) => {
    return setConfig(cfg => {
      const sources = cfg.sources.filter(s => s.id !== id);
      const currentSourceId = cfg.currentSourceId === id ? null : cfg.currentSourceId;
      const currentBvid = cfg.currentSourceId === id ? null : cfg.currentBvid;
      return { ...cfg, sources, currentSourceId, currentBvid };
    });
  });

  ipcMain.handle(IPC.RefreshSource, async (_e, { id }: RefreshSourcePayload) => {
    const cfg = getConfig();
    const src = cfg.sources.find(s => s.id === id);
    if (!src) throw new Error('source not found');
    const data = await fetchListArchives(src.mid, src.seasonId, src.listType ?? 'season', fetch);
    return setConfig(cfg => ({
      ...cfg,
      sources: cfg.sources.map(s =>
        s.id === id ? { ...s, name: data.name, videos: data.videos, lastFetched: Date.now() } : s
      ),
    }));
  });

  ipcMain.handle(IPC.SetCurrent, (_e, { sourceId, bvid }: SetCurrentPayload) => {
    return setConfig(cfg => ({ ...cfg, currentSourceId: sourceId, currentBvid: bvid }));
  });

  ipcMain.handle(IPC.SetPlayMode, (_e, { mode }: SetPlayModePayload) => {
    return setConfig(cfg => ({ ...cfg, playMode: mode }));
  });

  ipcMain.handle(IPC.SetMuted, (_e, { muted }: SetMutedPayload) => {
    opts.onSetMuted(muted);
    return setConfig(cfg => ({ ...cfg, muted }));
  });

  ipcMain.handle(IPC.SetEmoji, (_e, { emoji }: SetEmojiPayload) => {
    return setConfig(cfg => ({ ...cfg, petEmoji: emoji }));
  });

  ipcMain.handle(IPC.SetWindowMode, (_e, { mode }: SetWindowModePayload) => {
    opts.onSetWindowMode(mode);
    setConfig(cfg => ({ ...cfg, windowState: { ...cfg.windowState, mode } }));
  });

  ipcMain.handle(IPC.UpdateWindowGeometry, (_e, p: UpdateWindowGeometryPayload) => {
    opts.onUpdateGeometry(p);
    setConfig(cfg => ({
      ...cfg,
      windowState: {
        ...cfg.windowState,
        petPos: p.petPos ?? cfg.windowState.petPos,
        petSize: p.petSize ?? cfg.windowState.petSize,
        playerPos: p.playerPos ?? cfg.windowState.playerPos,
        playerSize: p.playerSize ?? cfg.windowState.playerSize,
      },
    }));
  });

  ipcMain.handle(IPC.Quit, () => app.quit());
}
