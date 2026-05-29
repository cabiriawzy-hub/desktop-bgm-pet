# Learning Mode Categorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Source.category` ('music' | 'learning') with grouped UI, and support two new source types — UP 主 投稿 (`uploads`) and 分P 视频 (`parts`).

**Architecture:** In-place extension of the existing Source/Video model. New `Category` and expanded `ListType` types; new fields are optional with hydrate-time normalize for backward-compat. Two new URL forms parsed by extending `parseListURL`; two new fetchers added to `bilibili-api.ts`. Player URL gets `&p={N}` for parts. SourceMenu groups list rows by category with conditional headers; add-source form gets a category picker.

**Tech Stack:** TypeScript, React, Zustand, Electron, vitest (test runner), B 站 web API.

**Spec:** `docs/superpowers/specs/2026-05-28-learning-mode-categorization-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/shared/types.ts` | modify | Add `Category`, extend `ListType`, add `Video.partNum`, add `Source.category`, add `Config.currentPartNum` |
| `src/shared/bilibili-url.ts` | modify | Extend `parseListURL` to recognize `'uploads'` and `'parts'` URL forms |
| `src/shared/bilibili-url.test.ts` | modify | Add test cases for new URL forms |
| `src/main/bilibili-api.ts` | modify | Add `parseMmSs`, `fetchUserUploads`, `fetchVideoParts`; extend `fetchListArchives` switch |
| `src/main/bilibili-api.test.ts` | modify | Add tests for the two new fetchers + extended multiplexer |
| `src/shared/ipc-channels.ts` | modify | Extend `AddSourcePayload` (add `category`) and `SetCurrentPayload` (add `partNum`) |
| `src/main/ipc.ts` | modify | Use new payload fields when writing config |
| `src/main/store.ts` | modify | Normalize source/config on every read so the rest of the system is shielded from legacy shapes |
| `src/main/store.test.ts` | create | Unit-test normalize helpers (pure functions) |
| `src/renderer/playback.ts` | modify | `pickNext` and `pickPrev` match by `(bvid, partNum)` instead of `bvid` alone |
| `src/renderer/playback.test.ts` | modify | Add tests for parts-source navigation |
| `src/renderer/state.ts` | modify | Track `currentPartNum`; selectors for `currentVideo` |
| `src/renderer/auto-advance.ts` | modify | Pass `partNum` to `triggerPlay` |
| `src/renderer/components/BilibiliFrame.tsx` | modify | Accept `partNum?: number` prop, append `&p={N}` to player URL, include in key |
| `src/renderer/components/App.tsx` | modify | Look up current Video by `(bvid, partNum)` and pass `partNum` to `BilibiliFrame` |
| `src/renderer/components/SourceMenu.tsx` | modify | Group sources by category with headers; add category picker in add form |

---

## Task 1: Foundation — extend types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Replace the file contents**

Replace `src/shared/types.ts` with:

```ts
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
    petPos: { x: -1, y: -1 },
    petSize: 80,
    playerPos: { x: -1, y: -1 },
    playerSize: { w: 360, h: 240 },
  },
};
```

- [ ] **Step 2: Verify it still typechecks**

Run: `npx tsc --noEmit`
Expected: passes with **no errors** (we haven't yet enforced `category` at construction sites; that happens in Task 8 when we normalize on read).

Note: even with `category: Category` (non-optional), TypeScript will not flag literal `Source` objects in tests because the tests don't construct them yet for the new shape. Existing tests use object literals that omit `category` — they'll fail typechecking. **Fix them in place** by adding `category: 'music'` to every literal `Source` in tests:

Edit `src/renderer/playback.test.ts` line 5-12 — change:
```ts
const src: Source = {
  id: 's1', name: 't', mid: '1', seasonId: '1', lastFetched: 0,
  videos: [ ... ],
};
```
to:
```ts
const src: Source = {
  id: 's1', name: 't', mid: '1', seasonId: '1', category: 'music', lastFetched: 0,
  videos: [ ... ],
};
```

Re-run `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 3: Run existing tests**

Run: `npm test`
Expected: all pass (we haven't changed runtime behavior, only added optional/normalize fields).

- [ ] **Step 4: Commit**

```bash
git add src/shared/types.ts src/renderer/playback.test.ts
git commit -m "types: add Category, partNum, currentPartNum (no behavior change)"
```

---

## Task 2: URL parser — recognize 'uploads' form

**Files:**
- Modify: `src/shared/bilibili-url.ts`
- Modify: `src/shared/bilibili-url.test.ts`

- [ ] **Step 1: Add failing tests for 'uploads' URL form**

Append to the existing `describe('parseListURL', ...)` block in `src/shared/bilibili-url.test.ts` (after the existing `it` blocks, before the closing `})`):

```ts
  it('parses bare UP 主 homepage URL as uploads', () => {
    const url = 'https://space.bilibili.com/3691000482499314';
    expect(parseListURL(url)).toEqual({
      mid: '3691000482499314',
      listId: '3691000482499314',
      listType: 'uploads',
    });
  });

  it('parses UP 主 homepage URL with trailing slash', () => {
    const url = 'https://space.bilibili.com/3691000482499314/';
    expect(parseListURL(url)).toEqual({
      mid: '3691000482499314',
      listId: '3691000482499314',
      listType: 'uploads',
    });
  });

  it('parses UP 主 homepage URL with /video subpath', () => {
    const url = 'https://space.bilibili.com/3691000482499314/video';
    expect(parseListURL(url)).toEqual({
      mid: '3691000482499314',
      listId: '3691000482499314',
      listType: 'uploads',
    });
  });

  it('parses UP 主 homepage URL with /upload/video subpath', () => {
    const url = 'https://space.bilibili.com/3691000482499314/upload/video';
    expect(parseListURL(url)).toEqual({
      mid: '3691000482499314',
      listId: '3691000482499314',
      listType: 'uploads',
    });
  });

  it('parses UP 主 homepage URL with /dynamic subpath', () => {
    const url = 'https://space.bilibili.com/3691000482499314/dynamic';
    expect(parseListURL(url)).toEqual({
      mid: '3691000482499314',
      listId: '3691000482499314',
      listType: 'uploads',
    });
  });

  it('ignores spm_id_from tracking param on UP 主 URL', () => {
    const url = 'https://space.bilibili.com/3691000482499314?spm_id_from=333.337.0.0';
    expect(parseListURL(url)).toEqual({
      mid: '3691000482499314',
      listId: '3691000482499314',
      listType: 'uploads',
    });
  });
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/shared/bilibili-url.test.ts`
Expected: FAIL — all six new tests throw `不是合法的 B 站列表 URL`.

- [ ] **Step 3: Modify `parseListURL` to recognize 'uploads'**

Replace the body of `parseListURL` in `src/shared/bilibili-url.ts` with:

```ts
const LISTS_PATH_RE = /^\/(\d+)\/lists\/(\d+)\/?$/;
const UPLOADS_PATH_RE = /^\/(\d+)(?:\/.*)?$/;

export function parseListURL(input: string): ListRef {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('不是合法的 B 站列表 URL');
  }

  if (url.hostname === 'space.bilibili.com') {
    // 优先匹配 /lists/{id} 形式(合集 / 视频列表)
    const listsMatch = LISTS_PATH_RE.exec(url.pathname);
    if (listsMatch) {
      const [, mid, listId] = listsMatch;
      const type = url.searchParams.get('type');
      if (type === 'season') return { mid, listId, listType: 'season' };
      if (type === 'series') return { mid, listId, listType: 'series' };
      if (type === 'collect') {
        throw new Error('不支持「个人收藏夹」(type=collect)，请用 UP 主自己的合集或视频列表');
      }
      throw new Error('URL 缺少 type=season 或 type=series 参数');
    }
    // 退化为裸 UP 主主页(可带任意子路径如 /video, /dynamic, /upload/video)
    const uploadsMatch = UPLOADS_PATH_RE.exec(url.pathname);
    if (uploadsMatch) {
      const mid = uploadsMatch[1];
      return { mid, listId: mid, listType: 'uploads' };
    }
  }

  throw new Error('不是合法的 B 站列表 URL');
}
```

(Keep the existing `ListRef`, `SeasonRef`, `ListType` type exports and `parseSeasonURL` compatibility shim at the top of the file unchanged — only the parsing logic is replaced.)

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/shared/bilibili-url.test.ts`
Expected: PASS — all existing tests + the six new 'uploads' tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/shared/bilibili-url.ts src/shared/bilibili-url.test.ts
git commit -m "url-parser: recognize bare UP 主 homepage as uploads source"
```

---

## Task 3: URL parser — recognize 'parts' form

**Files:**
- Modify: `src/shared/bilibili-url.ts`
- Modify: `src/shared/bilibili-url.test.ts`

- [ ] **Step 1: Add failing tests for 'parts' URL form**

Append to `describe('parseListURL', ...)` in `src/shared/bilibili-url.test.ts`:

```ts
  it('parses a bilibili.com video URL as parts', () => {
    const url = 'https://www.bilibili.com/video/BV1Y7411n7iM';
    expect(parseListURL(url)).toEqual({
      mid: '',
      listId: 'BV1Y7411n7iM',
      listType: 'parts',
    });
  });

  it('parses a bilibili.com video URL with trailing slash', () => {
    const url = 'https://www.bilibili.com/video/BV1Y7411n7iM/';
    expect(parseListURL(url)).toEqual({
      mid: '',
      listId: 'BV1Y7411n7iM',
      listType: 'parts',
    });
  });

  it('parses a bilibili.com video URL without www', () => {
    const url = 'https://bilibili.com/video/BV1Y7411n7iM/';
    expect(parseListURL(url)).toEqual({
      mid: '',
      listId: 'BV1Y7411n7iM',
      listType: 'parts',
    });
  });

  it('ignores ?p= and tracking params on video URL', () => {
    const url = 'https://www.bilibili.com/video/BV1Y7411n7iM/?p=5&spm_id_from=333.1391.0.0&vd_source=abc';
    expect(parseListURL(url)).toEqual({
      mid: '',
      listId: 'BV1Y7411n7iM',
      listType: 'parts',
    });
  });
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/shared/bilibili-url.test.ts`
Expected: FAIL — the four new tests throw `不是合法的 B 站列表 URL`.

- [ ] **Step 3: Extend `parseListURL` to recognize 'parts'**

Replace the `if (url.hostname === 'space.bilibili.com') { ... }` block in `parseListURL` with a wider hostname dispatch:

```ts
  if (url.hostname === 'space.bilibili.com') {
    // (existing season/series/uploads logic — unchanged)
    const listsMatch = LISTS_PATH_RE.exec(url.pathname);
    if (listsMatch) {
      const [, mid, listId] = listsMatch;
      const type = url.searchParams.get('type');
      if (type === 'season') return { mid, listId, listType: 'season' };
      if (type === 'series') return { mid, listId, listType: 'series' };
      if (type === 'collect') {
        throw new Error('不支持「个人收藏夹」(type=collect)，请用 UP 主自己的合集或视频列表');
      }
      throw new Error('URL 缺少 type=season 或 type=series 参数');
    }
    const uploadsMatch = UPLOADS_PATH_RE.exec(url.pathname);
    if (uploadsMatch) {
      const mid = uploadsMatch[1];
      return { mid, listId: mid, listType: 'uploads' };
    }
  }

  if (url.hostname === 'www.bilibili.com' || url.hostname === 'bilibili.com') {
    const partsMatch = VIDEO_PATH_RE.exec(url.pathname);
    if (partsMatch) {
      return { mid: '', listId: partsMatch[1], listType: 'parts' };
    }
  }

  throw new Error('不是合法的 B 站列表 URL');
```

Add the `VIDEO_PATH_RE` constant near the existing path regexes:

```ts
const VIDEO_PATH_RE = /^\/video\/(BV[0-9A-Za-z]+)\/?$/;
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/shared/bilibili-url.test.ts`
Expected: PASS — all existing + 'uploads' + new 'parts' tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/shared/bilibili-url.ts src/shared/bilibili-url.test.ts
git commit -m "url-parser: recognize bilibili.com/video/{bvid} as parts source"
```

---

## Task 4: API fetcher — `fetchVideoParts`

**Files:**
- Modify: `src/main/bilibili-api.ts`
- Modify: `src/main/bilibili-api.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/main/bilibili-api.test.ts` (after the existing `describe` blocks):

```ts
describe('fetchVideoParts', () => {
  it('returns videos for each page of a multi-part video', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: {
        bvid: 'BV1Y7411n7iM',
        title: 'Improve Your English',
        pic: 'http://cover.jpg',
        owner: { mid: 123 },
        pages: [
          { cid: 11, page: 1, part: 'Improve Your English (1)', duration: 1398 },
          { cid: 12, page: 2, part: 'Improve Your English (2)', duration: 1399 },
          { cid: 13, page: 3, part: 'Improve Your English (3)', duration: 1402 },
        ],
      },
    }));

    const { fetchVideoParts } = await import('./bilibili-api');
    const result = await fetchVideoParts('BV1Y7411n7iM', mockFetch);

    expect(result.name).toBe('Improve Your English');
    expect(result.videos).toEqual([
      { bvid: 'BV1Y7411n7iM', title: 'Improve Your English (1)', duration: 1398, cover: 'http://cover.jpg', partNum: 1 },
      { bvid: 'BV1Y7411n7iM', title: 'Improve Your English (2)', duration: 1399, cover: 'http://cover.jpg', partNum: 2 },
      { bvid: 'BV1Y7411n7iM', title: 'Improve Your English (3)', duration: 1402, cover: 'http://cover.jpg', partNum: 3 },
    ]);
  });

  it('calls the correct endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: { bvid: 'BV', title: 't', pic: 'p', owner: { mid: 1 }, pages: [] },
    }));
    const { fetchVideoParts } = await import('./bilibili-api');
    await fetchVideoParts('BV1Y7411n7iM', mockFetch);
    expect(mockFetch.mock.calls[0][0]).toContain('/x/web-interface/view?bvid=BV1Y7411n7iM');
  });

  it('throws when B 站 returns error code', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({ code: -404, message: 'not found' }));
    const { fetchVideoParts } = await import('./bilibili-api');
    await expect(fetchVideoParts('BV', mockFetch)).rejects.toThrow(/-404/);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/main/bilibili-api.test.ts`
Expected: FAIL — `fetchVideoParts is not a function`.

- [ ] **Step 3: Implement `fetchVideoParts`**

Append to `src/main/bilibili-api.ts` (after the existing `fetchSeriesArchives` function, before `fetchListArchives`):

```ts
type VideoViewResponse = {
  code: number;
  message?: string;
  data?: {
    bvid: string;
    title: string;
    pic: string;
    owner: { mid: number | string };
    pages: Array<{ cid: number; page: number; part: string; duration: number }>;
  };
};

/**
 * 拉取一个视频的全部分P。单次请求,不分页。
 * 主标题作为 source name;每个分P 作为一条 Video,共享 bvid,partNum 区分。
 */
export async function fetchVideoParts(bvid: string, fetcher: Fetcher): Promise<ListData> {
  const headers = {
    'User-Agent': UA,
    'Referer': `https://www.bilibili.com/video/${bvid}/`,
    'Origin': 'https://www.bilibili.com',
  };

  const url = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
  const res = await fetcher(url, { headers });
  const json = (await res.json()) as VideoViewResponse;

  if (json.code !== 0 || !json.data) {
    throw new Error(`B 站视频信息 API 失败 (code=${json.code}): ${json.message ?? 'unknown'}`);
  }

  const videos: Video[] = json.data.pages.map(p => ({
    bvid: json.data!.bvid,
    title: p.part,
    duration: p.duration,
    cover: json.data!.pic,
    partNum: p.page,
  }));

  return { name: json.data.title, videos };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/main/bilibili-api.test.ts`
Expected: PASS — all existing + new `fetchVideoParts` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/bilibili-api.ts src/main/bilibili-api.test.ts
git commit -m "api: add fetchVideoParts (single-bvid multi-page)"
```

---

## Task 5: API fetcher — `parseMmSs` + `fetchUserUploads`

**Files:**
- Modify: `src/main/bilibili-api.ts`
- Modify: `src/main/bilibili-api.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/main/bilibili-api.test.ts`:

```ts
describe('parseMmSs', () => {
  it('parses mm:ss', async () => {
    const { parseMmSs } = await import('./bilibili-api');
    expect(parseMmSs('23:18')).toBe(23 * 60 + 18);
    expect(parseMmSs('0:30')).toBe(30);
  });

  it('parses h:mm:ss', async () => {
    const { parseMmSs } = await import('./bilibili-api');
    expect(parseMmSs('1:02:33')).toBe(3600 + 2 * 60 + 33);
  });

  it('returns 0 for malformed input', async () => {
    const { parseMmSs } = await import('./bilibili-api');
    expect(parseMmSs('')).toBe(0);
    expect(parseMmSs('abc')).toBe(0);
  });
});

describe('fetchUserUploads', () => {
  it('returns parsed videos on success', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: {
        list: {
          vlist: [
            { bvid: 'BV1aaa', title: '永远保持积极乐观的心态', length: '00:18', pic: 'http://p1' },
            { bvid: 'BV1bbb', title: '想要找到心爱之人', length: '00:48', pic: 'http://p2' },
          ],
        },
        page: { pn: 1, ps: 30, count: 2 },
      },
    }));

    const { fetchUserUploads } = await import('./bilibili-api');
    const result = await fetchUserUploads('3691000482499314', mockFetch);

    expect(result.videos).toEqual([
      { bvid: 'BV1aaa', title: '永远保持积极乐观的心态', duration: 18, cover: 'http://p1' },
      { bvid: 'BV1bbb', title: '想要找到心爱之人', duration: 48, cover: 'http://p2' },
    ]);
    expect(result.name).toContain('3691000482499314');
  });

  it('paginates until count is reached', async () => {
    const page1 = {
      list: {
        vlist: Array.from({ length: 30 }, (_, i) => ({
          bvid: `BV${i}`, title: `t${i}`, length: '01:00', pic: 'p',
        })),
      },
      page: { pn: 1, ps: 30, count: 35 },
    };
    const page2 = {
      list: {
        vlist: Array.from({ length: 5 }, (_, i) => ({
          bvid: `BV${30 + i}`, title: `t${30 + i}`, length: '01:00', pic: 'p',
        })),
      },
      page: { pn: 2, ps: 30, count: 35 },
    };
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({ code: 0, data: page1 }))
      .mockResolvedValueOnce(mockJsonResponse({ code: 0, data: page2 }));

    const { fetchUserUploads } = await import('./bilibili-api');
    const result = await fetchUserUploads('1', mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.videos).toHaveLength(35);
  });

  it('throws when B 站 returns risk-control code', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({ code: -799, message: 'risk control' }));
    const { fetchUserUploads } = await import('./bilibili-api');
    await expect(fetchUserUploads('1', mockFetch)).rejects.toThrow(/-799/);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/main/bilibili-api.test.ts`
Expected: FAIL — `parseMmSs is not a function` and `fetchUserUploads is not a function`.

- [ ] **Step 3: Implement `parseMmSs` and `fetchUserUploads`**

Append to `src/main/bilibili-api.ts` (before `fetchListArchives`):

```ts
/**
 * 把 B 站投稿列表里的时长字符串("mm:ss" 或 "h:mm:ss")解析成秒。
 * 容错:格式不对就返回 0,不抛错。
 */
export function parseMmSs(s: string): number {
  if (!s) return 0;
  const parts = s.split(':');
  if (parts.length === 2) {
    const [m, ss] = parts.map(p => parseInt(p, 10));
    if (isFinite(m) && isFinite(ss)) return m * 60 + ss;
    return 0;
  }
  if (parts.length === 3) {
    const [h, m, ss] = parts.map(p => parseInt(p, 10));
    if (isFinite(h) && isFinite(m) && isFinite(ss)) return h * 3600 + m * 60 + ss;
    return 0;
  }
  return 0;
}

type SpaceArcSearchResponse = {
  code: number;
  message?: string;
  data?: {
    list: {
      vlist: Array<{ bvid: string; title: string; length: string; pic: string }>;
    };
    page: { pn: number; ps: number; count: number };
  };
};

/**
 * 拉取 UP 主全部投稿。先用未签名版 x/space/arc/search,
 * 如果被风控(-799 或类似)需要回到 spec 补 wbi 签名,本期不实现。
 */
export async function fetchUserUploads(mid: string, fetcher: Fetcher): Promise<ListData> {
  const headers = {
    'User-Agent': UA,
    'Referer': `https://space.bilibili.com/${mid}`,
    'Origin': 'https://space.bilibili.com',
  };

  const videos: Video[] = [];
  let page = 1;
  let total = Infinity;

  while (videos.length < total) {
    const url = `https://api.bilibili.com/x/space/arc/search?mid=${mid}&pn=${page}&ps=${PAGE_SIZE}&order=pubdate`;
    const res = await fetcher(url, { headers });
    const json = (await res.json()) as SpaceArcSearchResponse;

    if (json.code !== 0 || !json.data) {
      throw new Error(`B 站投稿 API 失败 (code=${json.code}): ${json.message ?? 'unknown'}`);
    }

    if (page === 1) {
      total = json.data.page.count;
    }

    for (const v of json.data.list.vlist) {
      videos.push({
        bvid: v.bvid,
        title: v.title,
        duration: parseMmSs(v.length),
        cover: v.pic,
      });
    }

    if (json.data.list.vlist.length < PAGE_SIZE) break;
    page++;
  }

  // 不签名的端点不返 UP 主名,用 mid 兜底
  return { name: `TA的视频 · UP-${mid}`, videos };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/main/bilibili-api.test.ts`
Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/bilibili-api.ts src/main/bilibili-api.test.ts
git commit -m "api: add fetchUserUploads + parseMmSs helper"
```

---

## Task 6: API fetcher — wire `fetchListArchives` for new types

**Files:**
- Modify: `src/main/bilibili-api.ts`
- Modify: `src/main/bilibili-api.test.ts`

- [ ] **Step 1: Add failing tests for the multiplexer**

Append to the existing `describe('fetchListArchives (dispatch)', ...)` block in `src/main/bilibili-api.test.ts`:

```ts
  it('routes listType=uploads to space/arc/search', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: { list: { vlist: [] }, page: { pn: 1, ps: 30, count: 0 } },
    }));
    await fetchListArchives('3691000482499314', '3691000482499314', 'uploads', mockFetch);
    expect(mockFetch.mock.calls[0][0]).toContain('space/arc/search');
  });

  it('routes listType=parts to web-interface/view', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: { bvid: 'BV', title: 't', pic: 'p', owner: { mid: 1 }, pages: [] },
    }));
    await fetchListArchives('', 'BV1Y7411n7iM', 'parts', mockFetch);
    expect(mockFetch.mock.calls[0][0]).toContain('web-interface/view?bvid=BV1Y7411n7iM');
  });
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/main/bilibili-api.test.ts -t 'fetchListArchives'`
Expected: FAIL — current `fetchListArchives` only routes 'season' and 'series'; new cases fall through to season and hit wrong endpoint.

- [ ] **Step 3: Extend `fetchListArchives`**

Replace the body of `fetchListArchives` in `src/main/bilibili-api.ts`:

```ts
/** 多态:根据 listType 路由到对应的实现。 */
export function fetchListArchives(
  mid: string,
  listId: string,
  listType: ListType,
  fetcher: Fetcher
): Promise<ListData> {
  switch (listType) {
    case 'series':  return fetchSeriesArchives(mid, listId, fetcher);
    case 'uploads': return fetchUserUploads(mid, fetcher);
    case 'parts':   return fetchVideoParts(listId, fetcher);
    case 'season':
    default:        return fetchSeasonArchives(mid, listId, fetcher);
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/main/bilibili-api.test.ts`
Expected: PASS — all dispatch tests routing correctly.

- [ ] **Step 5: Commit**

```bash
git add src/main/bilibili-api.ts src/main/bilibili-api.test.ts
git commit -m "api: dispatch fetchListArchives for uploads + parts"
```

---

## Task 7: Playback — match by `(bvid, partNum)`

**Files:**
- Modify: `src/renderer/playback.ts`
- Modify: `src/renderer/playback.test.ts`

- [ ] **Step 1: Add failing tests for parts navigation**

Append to `src/renderer/playback.test.ts`:

```ts
describe('pickNext (parts source)', () => {
  const partsSrc: Source = {
    id: 'sp', name: 'Improve Your English', mid: '', seasonId: 'BV1Y7411n7iM',
    listType: 'parts', category: 'learning', lastFetched: 0,
    videos: [
      { bvid: 'BV1Y7411n7iM', title: '(1)', cover: '', duration: 1398, partNum: 1 },
      { bvid: 'BV1Y7411n7iM', title: '(2)', cover: '', duration: 1399, partNum: 2 },
      { bvid: 'BV1Y7411n7iM', title: '(3)', cover: '', duration: 1402, partNum: 3 },
    ],
  };

  it('sequential: part 1 → 2 → 3 → 1', () => {
    expect(pickNext(partsSrc, 'BV1Y7411n7iM', 'sequential', 1)?.partNum).toBe(2);
    expect(pickNext(partsSrc, 'BV1Y7411n7iM', 'sequential', 2)?.partNum).toBe(3);
    expect(pickNext(partsSrc, 'BV1Y7411n7iM', 'sequential', 3)?.partNum).toBe(1);
  });

  it('loop: stays on current part', () => {
    expect(pickNext(partsSrc, 'BV1Y7411n7iM', 'loop', 2)?.partNum).toBe(2);
  });

  it('shuffle: never picks current part', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.5);
    const next = pickNext(partsSrc, 'BV1Y7411n7iM', 'shuffle', 1);
    expect(next?.partNum).not.toBe(1);
  });
});

describe('pickPrev (parts source)', () => {
  const partsSrc: Source = {
    id: 'sp', name: 'IYE', mid: '', seasonId: 'BV', listType: 'parts', category: 'learning', lastFetched: 0,
    videos: [
      { bvid: 'BV', title: '(1)', cover: '', duration: 60, partNum: 1 },
      { bvid: 'BV', title: '(2)', cover: '', duration: 60, partNum: 2 },
      { bvid: 'BV', title: '(3)', cover: '', duration: 60, partNum: 3 },
    ],
  };

  it('sequential: part 1 → 3 (wrap)', () => {
    expect(pickPrev(partsSrc, 'BV', 'sequential', 1)?.partNum).toBe(3);
    expect(pickPrev(partsSrc, 'BV', 'sequential', 2)?.partNum).toBe(1);
  });
});
```

You also need to update the existing `pickNext` / `pickPrev` calls in the original `describe` blocks (lines 14-37) — they now need a 4th argument (`null` for non-parts sources). Edit the existing test calls:

- Line 16: `expect(pickNext(src, 'a', 'sequential')?.bvid).toBe('b');` → `expect(pickNext(src, 'a', 'sequential', null)?.bvid).toBe('b');`
- Apply the same to every `pickNext(...)` and `pickPrev(...)` call in the existing tests, adding `, null` as the 4th arg.

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/renderer/playback.test.ts`
Expected: FAIL — TypeScript errors on signature mismatch + new tests can't run.

- [ ] **Step 3: Update `pickNext` and `pickPrev` signatures**

Replace `src/renderer/playback.ts`:

```ts
import type { Source, PlayMode, Video } from '../shared/types';

/** 同一 source 内,(bvid, partNum) 元组才能唯一识别一个 Video——
 *  对 parts 类型 source 来说所有 video 共享 bvid。
 */
function findIndex(videos: Video[], bvid: string | null, partNum: number | null): number {
  return videos.findIndex(v => v.bvid === bvid && (v.partNum ?? null) === partNum);
}

export function pickNext(
  source: Source,
  currentBvid: string | null,
  mode: PlayMode,
  currentPartNum: number | null,
): Video | null {
  const videos = source.videos;
  if (videos.length === 0) return null;

  if (mode === 'loop' && currentBvid) {
    return videos[findIndex(videos, currentBvid, currentPartNum)] ?? videos[0];
  }

  if (mode === 'shuffle') {
    if (videos.length === 1) return videos[0];
    const idx = findIndex(videos, currentBvid, currentPartNum);
    let next: Video;
    let nextIdx: number;
    do {
      nextIdx = Math.floor(Math.random() * videos.length);
      next = videos[nextIdx];
    } while (nextIdx === idx);
    return next;
  }

  // sequential
  const idx = findIndex(videos, currentBvid, currentPartNum);
  return videos[(idx + 1) % videos.length];
}

export function pickPrev(
  source: Source,
  currentBvid: string | null,
  mode: PlayMode,
  currentPartNum: number | null,
): Video | null {
  const videos = source.videos;
  if (videos.length === 0) return null;
  if (mode === 'loop' && currentBvid) {
    return videos[findIndex(videos, currentBvid, currentPartNum)] ?? videos[0];
  }
  if (mode === 'shuffle') {
    return pickNext(source, currentBvid, mode, currentPartNum);
  }
  const idx = findIndex(videos, currentBvid, currentPartNum);
  const prevIdx = idx <= 0 ? videos.length - 1 : idx - 1;
  return videos[prevIdx];
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/renderer/playback.test.ts`
Expected: PASS — all existing tests (updated) + new parts tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/playback.ts src/renderer/playback.test.ts
git commit -m "playback: pickNext/pickPrev match by (bvid, partNum) tuple"
```

---

## Task 8: Normalize legacy config in `store.ts`

**Files:**
- Modify: `src/main/store.ts`
- Create: `src/main/store.test.ts`

- [ ] **Step 1: Write failing tests for normalize**

Create `src/main/store.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeConfig, normalizeSource } from './store';

describe('normalizeSource', () => {
  it('defaults missing category to music', () => {
    const legacy = {
      id: 's1', name: 'foo', mid: '1', seasonId: '2',
      videos: [], lastFetched: 0,
    };
    expect(normalizeSource(legacy).category).toBe('music');
  });

  it('defaults missing listType to season', () => {
    const legacy = {
      id: 's1', name: 'foo', mid: '1', seasonId: '2',
      videos: [], lastFetched: 0,
    };
    expect(normalizeSource(legacy).listType).toBe('season');
  });

  it('preserves explicit category', () => {
    const src = {
      id: 's1', name: 'foo', mid: '1', seasonId: '2',
      category: 'learning' as const,
      videos: [], lastFetched: 0,
    };
    expect(normalizeSource(src).category).toBe('learning');
  });
});

describe('normalizeConfig', () => {
  it('normalizes every source', () => {
    const legacy = {
      sources: [
        { id: 's1', name: 'a', mid: '1', seasonId: '2', videos: [], lastFetched: 0 },
        { id: 's2', name: 'b', mid: '3', seasonId: '4', videos: [], lastFetched: 0 },
      ],
      currentSourceId: null,
      currentBvid: null,
      playMode: 'sequential',
      muted: false,
      petEmoji: '🪩',
      playerOpacity: 0.5,
      windowState: {
        mode: 'folded', petPos: { x: 0, y: 0 }, petSize: 80,
        playerPos: { x: 0, y: 0 }, playerSize: { w: 360, h: 240 },
      },
    };
    const result = normalizeConfig(legacy);
    expect(result.sources[0].category).toBe('music');
    expect(result.sources[1].category).toBe('music');
  });

  it('defaults missing currentPartNum to null', () => {
    const legacy = { sources: [] } as any;
    expect(normalizeConfig(legacy).currentPartNum).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/main/store.test.ts`
Expected: FAIL — `normalizeConfig is not exported` and `normalizeSource is not exported`.

- [ ] **Step 3: Replace `src/main/store.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/main/store.test.ts`
Expected: PASS — all four tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/store.ts src/main/store.test.ts
git commit -m "store: normalize legacy config on read (default category=music, currentPartNum=null)"
```

---

## Task 9: IPC + payload extensions

**Files:**
- Modify: `src/shared/ipc-channels.ts`
- Modify: `src/main/ipc.ts`

- [ ] **Step 1: Extend payload types**

Replace the relevant lines in `src/shared/ipc-channels.ts`:

```ts
import type { Category } from './types';

// ... (other types unchanged)

export type AddSourcePayload = { url: string; category: Category };
export type SetCurrentPayload = { sourceId: string; bvid: string; partNum: number | null };
```

(Add the `import type` at the top of the file. Keep all other type declarations as-is.)

- [ ] **Step 2: Update `main/ipc.ts` handlers**

Edit `src/main/ipc.ts`:

Replace the `IPC.AddSource` handler body:
```ts
  ipcMain.handle(IPC.AddSource, async (_e, { url, category }: AddSourcePayload) => {
    const { mid, listId, listType } = parseListURL(url);
    const data = await fetchListArchives(mid, listId, listType, fetch);
    return setConfig(cfg => {
      const newSource = {
        id: randomUUID(),
        name: data.name,
        mid,
        seasonId: listId,
        listType,
        category,
        videos: data.videos,
        lastFetched: Date.now(),
      };
      const sources = [...cfg.sources, newSource];
      const currentSourceId = cfg.currentSourceId ?? newSource.id;
      const currentBvid = cfg.currentBvid ?? (newSource.videos[0]?.bvid ?? null);
      const currentPartNum = cfg.currentBvid
        ? cfg.currentPartNum
        : (newSource.videos[0]?.partNum ?? null);
      return { ...cfg, sources, currentSourceId, currentBvid, currentPartNum };
    });
  });
```

Replace the `IPC.SetCurrent` handler body:
```ts
  ipcMain.handle(IPC.SetCurrent, (_e, { sourceId, bvid, partNum }: SetCurrentPayload) => {
    return setConfig(cfg => ({ ...cfg, currentSourceId: sourceId, currentBvid: bvid, currentPartNum: partNum }));
  });
```

Replace the `IPC.RemoveSource` handler body to also clear `currentPartNum` when the active source is removed:
```ts
  ipcMain.handle(IPC.RemoveSource, (_e, { id }: RemoveSourcePayload) => {
    return setConfig(cfg => {
      const sources = cfg.sources.filter(s => s.id !== id);
      const wasActive = cfg.currentSourceId === id;
      return {
        ...cfg,
        sources,
        currentSourceId: wasActive ? null : cfg.currentSourceId,
        currentBvid: wasActive ? null : cfg.currentBvid,
        currentPartNum: wasActive ? null : cfg.currentPartNum,
      };
    });
  });
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. If errors, the most likely culprits are the renderer code paths that call `api.addSource` / `api.setCurrent` without the new fields — those get fixed in Tasks 11-13. **For this step's gate, just confirm `src/main/*` and `src/shared/*` typecheck cleanly. Renderer errors are OK for now.**

Run: `npx tsc --noEmit -p tsconfig.node.json`
Expected: PASS (no errors).

- [ ] **Step 4: Run unit tests**

Run: `npm test`
Expected: PASS (all unit tests; no behavior change to the tested pure functions).

- [ ] **Step 5: Commit**

```bash
git add src/shared/ipc-channels.ts src/main/ipc.ts
git commit -m "ipc: extend AddSource/SetCurrent payloads (category, partNum)"
```

---

## Task 10: BilibiliFrame — accept `partNum` prop

**Files:**
- Modify: `src/renderer/components/BilibiliFrame.tsx`

- [ ] **Step 1: Modify props and URL construction**

Edit `src/renderer/components/BilibiliFrame.tsx`:

Change the `Props` type at the top:
```ts
type Props = { bvid: string; partNum: number | null; epoch: number };
```

Change the `src` construction and `key` inside the component body:
```ts
export function BilibiliFrame({ bvid, partNum, epoch }: Props) {
  const ref = useRef<WebviewTag>(null);
  const opacity = useStore(s => s.config.playerOpacity);
  const partSuffix = partNum != null ? `&p=${partNum}` : '';
  const src = `https://player.bilibili.com/player.html?bvid=${bvid}${partSuffix}&autoplay=1&danmaku=0&hideCoverInfo=1`;

  useEffect(() => {
    // ... unchanged ...
  }, [bvid, partNum, epoch]);

  return (
    <webview
      ref={ref}
      key={`${bvid}-p${partNum ?? 0}-${epoch}`}
      src={src}
      // ... rest unchanged ...
    />
  );
}
```

(The `useEffect` dependency array adds `partNum`; the rest of the body — chrome killer injection, style, etc. — does not change.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors about App.tsx not passing `partNum`. **This is expected** — it gets fixed in Task 11. Don't try to "fix" by making partNum optional; leave it required.

- [ ] **Step 3: Commit (intermediate, with known type error)**

The build is intentionally broken between Task 10 and Task 11. Don't commit yet; do Task 11 first then commit together.

(Skip git operations for this task — proceed directly to Task 11.)

---

## Task 11: App.tsx — find current Video and pass `partNum`

**Files:**
- Modify: `src/renderer/components/App.tsx`
- Modify: `src/renderer/state.ts` (add selector)
- Modify: `src/renderer/auto-advance.ts` (propagate partNum)

- [ ] **Step 1: Wire `currentPartNum` through `state.ts`**

The store's `Config` type already includes `currentPartNum` (Task 1). Update `triggerPlay` to accept partNum and the IPC call in `togglePaused` if any. Replace `src/renderer/state.ts`:

```ts
// src/renderer/state.ts
import { create } from 'zustand';
import type { Config } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/types';
import { api } from './api';
import { playerRef } from './playerRef';

type State = {
  config: Config;
  ready: boolean;
  playEpoch: number;
  paused: boolean;
  hydrate: () => Promise<void>;
  setConfig: (cfg: Config) => void;
  triggerPlay: (cfg: Config) => void;
  togglePaused: () => void;
};

export const useStore = create<State>((set) => ({
  config: DEFAULT_CONFIG,
  ready: false,
  playEpoch: 0,
  paused: false,
  hydrate: async () => {
    const cfg = await api.getConfig();
    set({ config: cfg, ready: true });
    for (const src of cfg.sources) {
      api.refreshSource({ id: src.id })
        .then(updated => set({ config: updated }))
        .catch(err => console.warn(`refresh "${src.name}" failed:`, err));
    }
  },
  setConfig: (config) => set({ config }),
  triggerPlay: (config) => set(s => ({ config, playEpoch: s.playEpoch + 1, paused: false })),
  togglePaused: () => set(s => {
    const willBePaused = !s.paused;
    if (willBePaused) playerRef.pause();
    else playerRef.play();
    return { paused: willBePaused };
  }),
}));
```

(This file is mostly unchanged; the public state shape is the same since `Config` now includes `currentPartNum`. The main reason to touch it here is to confirm it still typechecks.)

- [ ] **Step 2: Update `App.tsx` to find current Video and pass `partNum`**

Replace the relevant lines in `src/renderer/components/App.tsx`:

```tsx
// Inside the App component, replace:
//   const currentBvid = useStore(s => s.config.currentBvid);
// with:
  const currentBvid = useStore(s => s.config.currentBvid);
  const currentPartNum = useStore(s => s.config.currentPartNum);
  const sources = useStore(s => s.config.sources);
  const currentSourceId = useStore(s => s.config.currentSourceId);

  const currentSource = sources.find(s => s.id === currentSourceId);
  const currentVideo = currentSource?.videos.find(v =>
    v.bvid === currentBvid && (v.partNum ?? null) === currentPartNum
  );
```

Then change the `<BilibiliFrame>` invocation from:
```tsx
<BilibiliFrame bvid={currentBvid} epoch={playEpoch} />
```
to:
```tsx
<BilibiliFrame
  bvid={currentBvid}
  partNum={currentPartNum}
  epoch={playEpoch}
/>
```

And the surrounding conditional:
```tsx
{currentBvid && (
  <div style={...}>
    <BilibiliFrame
      bvid={currentBvid}
      partNum={currentPartNum}
      epoch={playEpoch}
    />
  </div>
)}
```

- [ ] **Step 3: Update `auto-advance.ts` to pass `partNum` to `pickNext` and `setCurrent`**

Replace `src/renderer/auto-advance.ts`:

```ts
import { useEffect } from 'react';
import { useStore } from './state';
import { api } from './api';
import { pickNext } from './playback';

/**
 * 监听当前播放视频的 duration,到点自动切下一首。
 * iframe 跨域拿不到真实结束事件,用本地定时器估算。
 */
export function useAutoAdvance() {
  const config = useStore(s => s.config);
  const triggerPlay = useStore(s => s.triggerPlay);
  const paused = useStore(s => s.paused);
  const currentBvid = config.currentBvid;
  const currentPartNum = config.currentPartNum;
  const currentSource = config.sources.find(s => s.id === config.currentSourceId);
  const currentVideo = currentSource?.videos.find(v =>
    v.bvid === currentBvid && (v.partNum ?? null) === currentPartNum
  );
  const duration = currentVideo?.duration ?? 0;

  useEffect(() => {
    if (!currentBvid || !currentSource || duration <= 0 || paused) return;
    const ms = (duration + 2) * 1000;
    const id = setTimeout(async () => {
      const v = pickNext(currentSource, currentBvid, config.playMode, currentPartNum);
      if (v) {
        const cfg = await api.setCurrent({
          sourceId: currentSource.id,
          bvid: v.bvid,
          partNum: v.partNum ?? null,
        });
        triggerPlay(cfg);
      }
    }, ms);
    return () => clearTimeout(id);
  }, [currentBvid, currentPartNum, currentSource, duration, config.playMode, paused, triggerPlay]);
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors only in `SourceMenu.tsx` (it still calls `api.setCurrent` without `partNum` and `api.addSource` without `category`). **Those get fixed in Tasks 12-13.**

- [ ] **Step 5: Commit (Task 10 + 11 + auto-advance together)**

```bash
git add src/renderer/components/BilibiliFrame.tsx src/renderer/components/App.tsx src/renderer/state.ts src/renderer/auto-advance.ts
git commit -m "player: wire (bvid, partNum) tuple through state + auto-advance"
```

---

## Task 12: SourceMenu — group sources by category with headers

**Files:**
- Modify: `src/renderer/components/SourceMenu.tsx`

- [ ] **Step 1: Add a small inline `CategoryHeader` component**

Open `src/renderer/components/SourceMenu.tsx`. Inside the file but outside the main `SourceMenu` component (e.g., right before `export function SourceMenu`), add:

```tsx
function CategoryHeader({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div style={{
      padding: '8px 10px 4px',
      fontSize: 10,
      fontWeight: 600,
      color: 'rgba(255,255,255,0.45)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}>
      <span>{emoji}</span>
      <span>{label}</span>
    </div>
  );
}
```

- [ ] **Step 2: Replace the `view === 'sources'` rendering block**

Find the existing block in `src/renderer/components/SourceMenu.tsx` that renders the source list (in the `else` branch where `view === 'sources'`, currently `sources.map(s => (...))`). Replace it with:

```tsx
          (() => {
            const music = sources.filter(s => s.category === 'music');
            const learning = sources.filter(s => s.category === 'learning');
            const renderRow = (s: typeof sources[number]) => (
              <div
                key={s.id}
                onClick={() => switchSource(s.id)}
                style={rowStyle(s.id === currentSourceId)}
              >
                <span style={{
                  width: 14, flexShrink: 0, fontSize: 11,
                  color: s.id === currentSourceId ? '#5cb6ff' : 'transparent',
                }}>✓</span>
                <span style={{
                  flex: 1, minWidth: 0,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {s.name}
                </span>
                <span style={{
                  fontSize: 10, color: 'rgba(255,255,255,0.4)',
                  fontVariantNumeric: 'tabular-nums',
                }}>{s.videos.length}</span>
              </div>
            );
            return (
              <>
                {music.length > 0 && <CategoryHeader emoji="🎵" label="音乐" />}
                {music.map(renderRow)}
                {learning.length > 0 && <CategoryHeader emoji="📖" label="英文学习" />}
                {learning.map(renderRow)}
              </>
            );
          })()
```

- [ ] **Step 3: Run dev mode to visually verify**

Run: `BROADCAST_DEVTOOLS=1 npm run dev`
Click pet → expand → ⏯ menu → 合集 ▾ button. Expected: existing 4 sources appear under a 🎵 音乐 header. The 英文学习 group is empty so its header does not show.

- [ ] **Step 4: Stop dev (Ctrl+C) and commit**

```bash
git add src/renderer/components/SourceMenu.tsx
git commit -m "SourceMenu: group source list by category with headers"
```

---

## Task 13: SourceMenu — category picker in add form

**Files:**
- Modify: `src/renderer/components/SourceMenu.tsx`

- [ ] **Step 1: Add `category` state in the component**

Near the other `useState` calls at the top of `export function SourceMenu(...)`, add:

```tsx
  const [newCategory, setNewCategory] = useState<'music' | 'learning'>('music');
```

- [ ] **Step 2: Update `onAdd` to send the chosen category**

Replace the existing `onAdd` function:
```tsx
  const onAdd = async () => {
    setError(null);
    try {
      const prevCurrent = useStore.getState().config.currentBvid;
      const cfg = await api.addSource({ url: url.trim(), category: newCategory });
      if (!prevCurrent && cfg.currentBvid) triggerPlay(cfg);
      else setConfig(cfg);
      setUrl('');
      setAdding(false);
      setNewCategory('music');  // reset for next add
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };
```

- [ ] **Step 3: Render the category picker above the URL input**

Find the `{adding && (...)}` rendering block (currently inside the Footer div, starts with `<div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>`). Add the category picker before the `<input>`:

```tsx
            <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setNewCategory('music')}
                  style={{
                    flex: 1, padding: '4px 0', fontSize: 11,
                    background: newCategory === 'music' ? 'rgba(92,182,255,0.25)' : 'rgba(255,255,255,0.06)',
                    color: newCategory === 'music' ? '#5cb6ff' : 'rgba(255,255,255,0.75)',
                    border: 'none', borderRadius: 4, cursor: 'pointer',
                  }}
                >🎵 音乐</button>
                <button
                  onClick={() => setNewCategory('learning')}
                  style={{
                    flex: 1, padding: '4px 0', fontSize: 11,
                    background: newCategory === 'learning' ? 'rgba(92,182,255,0.25)' : 'rgba(255,255,255,0.06)',
                    color: newCategory === 'learning' ? '#5cb6ff' : 'rgba(255,255,255,0.75)',
                    border: 'none', borderRadius: 4, cursor: 'pointer',
                  }}
                >📖 英文学习</button>
              </div>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="space.bilibili.com/... 或 bilibili.com/video/BV..."
                style={{
                  width: '100%', padding: '5px 8px', fontSize: 11,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 4, color: '#fff', outline: 'none',
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={onAdd} style={{
                  flex: 1, padding: '5px 0', fontSize: 11,
                  background: '#5cb6ff', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}>添加</button>
                <button onClick={() => { setAdding(false); setError(null); }} style={{
                  padding: '5px 10px', fontSize: 11,
                  background: 'rgba(255,255,255,0.1)', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}>取消</button>
              </div>
              {error && <div style={{ fontSize: 10, color: '#ff7878' }}>{error}</div>}
            </div>
```

(The placeholder text is also updated to mention both URL forms.)

- [ ] **Step 4: Update the renderer-side IPC call shape for SetCurrent**

Find the existing `pickTrack` function near the top of the component:
```tsx
  const pickTrack = async (bvid: string) => {
    if (!currentSource) return;
    const cfg = await api.setCurrent({ sourceId: currentSource.id, bvid });
    triggerPlay(cfg);
    onClose();
  };
```

Change it to also pass `partNum`:
```tsx
  const pickTrack = async (bvid: string, partNum: number | null) => {
    if (!currentSource) return;
    const cfg = await api.setCurrent({ sourceId: currentSource.id, bvid, partNum });
    triggerPlay(cfg);
    onClose();
  };
```

And update the call site in the 'tracks' view (where the source's videos are mapped to rows). Find this line:
```tsx
                onClick={() => pickTrack(v.bvid)}
```
Change to:
```tsx
                onClick={() => pickTrack(v.bvid, v.partNum ?? null)}
```

Also update `switchSource`:
```tsx
  const switchSource = async (sourceId: string) => {
    const src = sources.find(s => s.id === sourceId);
    if (!src || src.videos.length === 0) return;
    const first = src.videos[0];
    const cfg = await api.setCurrent({ sourceId, bvid: first.bvid, partNum: first.partNum ?? null });
    triggerPlay(cfg);
    setView('tracks');
    onClose();
  };
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS — no remaining type errors anywhere in the codebase.

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: PASS — all unit tests.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/SourceMenu.tsx
git commit -m "SourceMenu: category picker in add form + pass partNum through SetCurrent"
```

---

## Task 14: Manual verification + version bump

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Run dev mode**

Run: `BROADCAST_DEVTOOLS=1 npm run dev`

- [ ] **Step 2: Manual checklist (record results in PR)**

Walk through each item from the spec's "手动验证清单" section. Tick each as it passes:

- [ ] Paste `https://www.bilibili.com/video/BV1Y7411n7iM/?spm_id_from=333.1391.0.0` → pick 英文学习 → 添加. SourceMenu shows the new source under 📖 英文学习. Expanding it lists 457 parts with titles `Improve Your English (1)..(457)`.
- [ ] Paste `https://space.bilibili.com/3691000482499314?spm_id_from=333.337.0.0` → pick 英文学习 → 添加. If it errors with `code: -799`, **stop** and surface this to the user — wbi signing is needed (see spec "已知风险"). Otherwise the source appears with ~99 投稿 entries.
- [ ] Click part 5 in a parts source. The player URL (visible in main devtools `BilibiliFrame.tsx:src`) contains `&p=5`. Audio + video advance for part 5.
- [ ] Wait for part 5 to finish (or set duration to 5s by editing config manually). It auto-advances to part 6.
- [ ] 选择合集 menu shows 🎵 音乐 header above the original 4 sources, and 📖 英文学习 header above the new ones. If you remove all music sources, the 🎵 header disappears.
- [ ] In the 添加 form, leave the picker at 🎵 默认 and paste an existing season URL. It adds under 🎵 音乐.
- [ ] Quit and restart the app. All sources from before this release retain `category: 'music'` (visible under 🎵 group). Nothing went missing.

If any item fails, do NOT bump version. File a follow-up issue or fix inline; re-run the checklist.

- [ ] **Step 3: Bump version to 0.2.0**

Edit `package.json` line 3: change `"version": "0.1.2"` to `"version": "0.2.0"` (minor bump since this adds new features).

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: bump version to 0.2.0 (learning-mode categorization)"
```

- [ ] **Step 5: Tag + push to fire CI**

```bash
git push origin main
git tag v0.2.0
git push origin v0.2.0
```

GitHub Actions builds and uploads the 4 artifacts to a new v0.2.0 release. Confirm via:

```bash
gh release view v0.2.0 --json assets --jq '.assets[].name'
```

Expected output:
```
Broadcast-0.2.0-arm64.dmg
Broadcast-0.2.0-arm64.zip
Broadcast-0.2.0-x64.dmg
Broadcast-0.2.0-x64.zip
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Data model (Task 1)
- ✅ URL parsing for `uploads` and `parts` (Tasks 2, 3)
- ✅ Two new API fetchers + mm:ss helper (Tasks 4, 5)
- ✅ `fetchListArchives` dispatcher extended (Task 6)
- ✅ pickNext/pickPrev tuple matching (Task 7)
- ✅ Migration via store-level normalize (Task 8)
- ✅ IPC payload extensions (Task 9)
- ✅ BilibiliFrame `&p=` URL (Task 10)
- ✅ App.tsx + auto-advance wiring (Task 11)
- ✅ SourceMenu grouped rendering (Task 12)
- ✅ SourceMenu category picker (Task 13)
- ✅ Manual verification (Task 14)
- Spec mentions wbi signing as a "known risk" follow-up — explicitly out of scope per spec; Task 14 stops and surfaces if -799 occurs. Coverage complete.

**2. Placeholder scan:**
- No "TBD", "TODO", "implement later" in the plan.
- Every code block is complete.
- Every command has expected output.

**3. Type consistency:**
- `pickNext` signature: `(source, currentBvid, mode, currentPartNum)` — used identically in Tasks 7, 11 (auto-advance).
- `Source.category: Category`, `Video.partNum?: number`, `Config.currentPartNum: number | null` — consistent across Tasks 1, 7, 8, 9, 10, 11, 12, 13.
- `AddSourcePayload` (`{ url, category }`) and `SetCurrentPayload` (`{ sourceId, bvid, partNum }`) — consistent between Tasks 9 and 13.
- `normalizeSource` / `normalizeConfig` — exported from `src/main/store.ts`, tested in Task 8, consumed via `getConfig()` (no other call sites).

All consistent.
