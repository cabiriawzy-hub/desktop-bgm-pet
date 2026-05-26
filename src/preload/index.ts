// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type {
  AddSourcePayload, RemoveSourcePayload, RefreshSourcePayload,
  SetCurrentPayload, SetPlayModePayload, SetMutedPayload, SetEmojiPayload,
  SetPlayerOpacityPayload,
  SetWindowModePayload, UpdateWindowGeometryPayload,
} from '../shared/ipc-channels';
import type { Config } from '../shared/types';

const api = {
  getConfig: (): Promise<Config> => ipcRenderer.invoke(IPC.GetConfig),
  addSource: (p: AddSourcePayload): Promise<Config> => ipcRenderer.invoke(IPC.AddSource, p),
  removeSource: (p: RemoveSourcePayload): Promise<Config> => ipcRenderer.invoke(IPC.RemoveSource, p),
  refreshSource: (p: RefreshSourcePayload): Promise<Config> => ipcRenderer.invoke(IPC.RefreshSource, p),
  setCurrent: (p: SetCurrentPayload): Promise<Config> => ipcRenderer.invoke(IPC.SetCurrent, p),
  setPlayMode: (p: SetPlayModePayload): Promise<Config> => ipcRenderer.invoke(IPC.SetPlayMode, p),
  setMuted: (p: SetMutedPayload): Promise<Config> => ipcRenderer.invoke(IPC.SetMuted, p),
  setEmoji: (p: SetEmojiPayload): Promise<Config> => ipcRenderer.invoke(IPC.SetEmoji, p),
  setPlayerOpacity: (p: SetPlayerOpacityPayload): Promise<Config> => ipcRenderer.invoke(IPC.SetPlayerOpacity, p),
  setWindowMode: (p: SetWindowModePayload): Promise<void> => ipcRenderer.invoke(IPC.SetWindowMode, p),
  updateWindowGeometry: (p: UpdateWindowGeometryPayload): Promise<void> => ipcRenderer.invoke(IPC.UpdateWindowGeometry, p),
  quit: (): Promise<void> => ipcRenderer.invoke(IPC.Quit),
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
