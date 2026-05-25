// src/renderer/state.ts
import { create } from 'zustand';
import type { Config } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/types';
import { api } from './api';

type State = {
  config: Config;
  ready: boolean;
  // playEpoch 用作 BilibiliFrame 的 key 的一部分，每次「触发播放」时递增，
  // 用来强制 iframe 重载——特别是 loop 模式下 currentBvid 没变也要重新开始。
  playEpoch: number;
  hydrate: () => Promise<void>;
  setConfig: (cfg: Config) => void;
  /** 应用新 config 并 bump epoch，触发 iframe 重新加载 */
  triggerPlay: (cfg: Config) => void;
};

export const useStore = create<State>((set) => ({
  config: DEFAULT_CONFIG,
  ready: false,
  playEpoch: 0,
  hydrate: async () => {
    const cfg = await api.getConfig();
    set({ config: cfg, ready: true });
    // 启动后异步刷新所有合集，差异更新本地缓存（spec §4.3）
    for (const src of cfg.sources) {
      api.refreshSource({ id: src.id })
        .then(updated => set({ config: updated }))
        .catch(err => console.warn(`refresh "${src.name}" failed:`, err));
    }
  },
  setConfig: (config) => set({ config }),
  triggerPlay: (config) => set(s => ({ config, playEpoch: s.playEpoch + 1 })),
}));
