import Store from 'electron-store';
import type { Config, Source } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/types';

const store = new Store<Config>({
  name: 'config',
  defaults: DEFAULT_CONFIG,
});

/** 把老 source 升级到当前 schema:补 listType 和 category 默认值。 */
export function normalizeSource(s: any): Source {
  return {
    ...s,
    listType: s.listType ?? 'season',
    category: s.category ?? 'music',
  };
}

/** 把老 config 升级到当前 schema:每个 source 都 normalize,补 currentPartNum 默认值。 */
export function normalizeConfig(c: any): Config {
  return {
    ...DEFAULT_CONFIG,
    ...c,
    sources: (c.sources ?? []).map(normalizeSource),
    currentPartNum: c.currentPartNum ?? null,
  };
}

export function getConfig(): Config {
  return normalizeConfig(store.store);
}

export function setConfig(updater: (cfg: Config) => Config): Config {
  const next = updater(getConfig());
  store.store = next;
  return next;
}

export function resetConfig(): void {
  store.clear();
}

/** 暴露存储路径方便排查 */
export function getConfigPath(): string {
  return store.path;
}
