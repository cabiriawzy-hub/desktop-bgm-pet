// src/main/store.ts
import Store from 'electron-store';
import type { Config } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/types';

const store = new Store<Config>({
  name: 'config',
  defaults: DEFAULT_CONFIG,
});

export function getConfig(): Config {
  return store.store;
}

export function setConfig(updater: (cfg: Config) => Config): Config {
  const next = updater(store.store);
  store.store = next;
  return next;
}

export function resetConfig(): void {
  store.clear();
}

// 暴露存储路径方便排查
export function getConfigPath(): string {
  return store.path;
}
