// src/renderer/state.ts
import { create } from 'zustand';
import type { Config } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/types';
import { api } from './api';

type State = {
  config: Config;
  ready: boolean;
  hydrate: () => Promise<void>;
  setConfig: (cfg: Config) => void;
};

export const useStore = create<State>((set) => ({
  config: DEFAULT_CONFIG,
  ready: false,
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
}));
