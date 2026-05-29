# 学习模式分类(category)+ 新增 UP 主投稿 / 分P 视频两种 source — 设计

**日期:** 2026-05-28
**状态:** 待实施

## 目标

在 Broadcast (desktop BGM pet) 现有的 source 模型上扩展两个维度,让用户能把"音乐"和"英文学习"两类内容并存管理:

1. **分类**:每个 source 标 `category: 'music' | 'learning'`,在「选择合集」菜单里上下分组显示;两类不影响播放行为(都共享 sequential/shuffle/loop)。
2. **两种新 source 类型**:UP 主投稿(`uploads`)、分P 视频(`parts`),配合学习类常用的两种 B 站内容形态。

非目标:跨句循环、AB 段重复、跟读特化交互等。它们属于后续可选扩展,本设计不覆盖。

## 用户故事

- 用户在 SourceMenu 看到现有 4 个音乐 source 上面有「🎵 音乐」header,如果之后添加学习类内容,会出现「📖 英文学习」header 和对应 source。
- 用户粘 `https://www.bilibili.com/video/BV1Y7411n7iM/?spm_id_from=...` → 选「英文学习」 → app 把 457 个分P 全部当 video 拉进来,每个 part 在列表里独立显示,可单独点播放。
- 用户粘 `https://space.bilibili.com/3691000482499314?spm_id_from=...` → 选「英文学习」 → app 把这位 UP 主全部 99 个投稿拉进来,每条投稿是独立 bvid。重启 app 时跟着 B 站源刷新,新发的会出现。

## 数据模型

文件:`src/shared/types.ts`

```ts
export type Category = 'music' | 'learning';

// 沿用,只是 union 多两项
export type ListType = 'season' | 'series' | 'uploads' | 'parts';

export type Video = {
  bvid: string;
  title: string;
  cover: string;
  duration: number;          // 秒
  partNum?: number;          // 仅 listType='parts' 下使用,1-indexed
};

export type Source = {
  id: string;
  name: string;
  // listType='parts' 下 mid 是 UP 主 mid;其他情况是该列表归属的 mid
  mid: string;
  // 历史字段名,装的内容随 listType 变:
  //   season  -> season_id
  //   series  -> series_id
  //   uploads -> 用户 mid(冗余存一份,方便 fetcher 找参数)
  //   parts   -> bvid
  seasonId: string;
  listType?: ListType;       // 老 config 没有这字段就当 'season'
  category: Category;        // 新增,migration 时默认 'music'
  videos: Video[];
  lastFetched: number;
};

export type Config = {
  // ...其他保留
  currentBvid: string | null;
  currentPartNum: number | null;  // 新增,只在播分P 时非 null
  // ...
};
```

老 config 字段缺失时的兜底:`listType ??= 'season'`、`category ??= 'music'`、`currentPartNum ??= null`。靠 hydrate 时一次性 normalize,不写 store 迁移代码。

## URL 解析

文件:`src/shared/bilibili-url.ts`

`parseListURL(input)` 扩展为接受四种 URL,返回 `ListRef = { mid, listId, listType }`:

| 输入 | host + path | listType | mid | listId |
|---|---|---|---|---|
| `space.bilibili.com/{mid}/lists/{id}?type=season` | space + `/{m}/lists/{l}` | `season` | m | l |
| `space.bilibili.com/{mid}/lists/{id}?type=series` | space + `/{m}/lists/{l}` | `series` | m | l |
| `space.bilibili.com/{mid}`(可选尾随 `/`、`/video`、`/upload/video`、`/dynamic` 等) | space + `/{m}[/任意子路径]` | `uploads` | m | m(冗余) |
| `(www.)?bilibili.com/video/{bvid}` 可带 `?p=N`(忽略) | (www.)bilibili + `/video/{b}` | `parts` | `''` | b |

识别优先级(自顶向下,先匹配的胜出):

1. host 是 `space.bilibili.com` 且 path 含 `/lists/{id}` → 检查 `?type=` → `season` / `series`。`type=collect` 显式抛错。
2. host 是 `space.bilibili.com` 且 path 不含 `/lists/` → `uploads`(忽略后续子路径)
3. host 是 `www.bilibili.com` 或 `bilibili.com` 且 path 形如 `/video/{bvid}` → `parts`(忽略 `?p=`)
4. 其他 → 抛错

不做:`b23.tv` 短链展开、`m.bilibili.com` 移动端识别。

`spm_id_from`、`vd_source` 等 tracking 参数:解析时直接忽略,只看 hostname / pathname / `?type=`。

## API 接入

文件:`src/main/bilibili-api.ts`

新增两个 fetcher,跟现有 `fetchSeasonArchives` / `fetchSeriesArchives` 一样接受 `Fetcher` 参数(便于单元测试 mock)。

### `fetchUserUploads(mid, fetcher): Promise<ListData>`

- 端点:**先用不签名版** `https://api.bilibili.com/x/space/arc/search?mid={mid}&pn={page}&ps=30&order=pubdate`
- Referer 用 `https://space.bilibili.com/{mid}`、UA 用现有 `UA` 常量
- 分页:每页 30 条,响应里 `data.page.count` 给总数,翻完
- 字段映射:`data.list.vlist[]` 每项 → `Video { bvid, title, duration: parseDuration(length), cover: pic }`
  - `length` 是字符串如 `"23:18"` 或 `"1:02:33"`,要写个小函数 `parseMmSs(s)` 解析成秒
- `name`:`'TA的视频 · UP-' + mid` 兜底(B 站这接口不返 UP 主名;后续可以另调 `x/web-interface/card?mid=...` 取真名,本期不做)
- **wbi 签名兜底**:如果 unsigned 调用返回 `code: -799`(`request was banned because of risk control`)或类似,加 wbi 签名重试:
  - 从 `x/web-interface/nav` 拉 `wbi_img.img_url` 和 `wbi_img.sub_url`
  - 提取 img_key / sub_key,按 B 站 mixin 表生成 `w_rid` 和 `wts`,签名查询串
  - 这部分实现策略:先走 unsigned,失败再加;**本期 spec 不强制做 wbi**,作为快速迭代项

### `fetchVideoParts(bvid, fetcher): Promise<ListData>`

- 端点:`https://api.bilibili.com/x/web-interface/view?bvid={bvid}`(单次,不分页)
- 字段映射:
  - `name`:`data.title`(整个视频的主标题)
  - `data.pages[]` 每项 → `Video { bvid, title: page.part, duration: page.duration, cover: data.pic, partNum: page.page }`
  - `mid`:`data.owner.mid`(透传以备扩展,不在 source.mid 里强制用)

### `fetchListArchives` 多态分支

```ts
switch (listType) {
  case 'series':  return fetchSeriesArchives(mid, listId, fetcher);
  case 'uploads': return fetchUserUploads(mid, fetcher);
  case 'parts':   return fetchVideoParts(listId, fetcher);   // listId 装的是 bvid
  default:        return fetchSeasonArchives(mid, listId, fetcher);
}
```

## 播放器

文件:`src/renderer/components/BilibiliFrame.tsx`、`src/renderer/state.ts`、`src/renderer/components/App.tsx`、`src/renderer/playback.ts`

### `BilibiliFrame` props

```ts
type Props = { bvid: string; partNum: number | null; epoch: number };
```

src 构造:
```ts
const partSuffix = partNum != null ? `&p=${partNum}` : '';
const src = `https://player.bilibili.com/player.html?bvid=${bvid}${partSuffix}&autoplay=1&danmaku=0&hideCoverInfo=1`;
```

webview key:`${bvid}-p${partNum ?? 0}-${epoch}`(切 part 也触发 remount)。

### `App.tsx` 选择当前 video

不再传 `bvid={currentBvid}`,改为查找当前 Video 拿到 `bvid` + `partNum` 一起传:

```tsx
const currentVideo = currentSource?.videos.find(v =>
  v.bvid === currentBvid && (v.partNum ?? null) === currentPartNum
);
{currentVideo && (
  <BilibiliFrame bvid={currentVideo.bvid} partNum={currentVideo.partNum ?? null} epoch={playEpoch} />
)}
```

### `playback.ts/pickNext`

签名不变,但内部用 `(bvid, partNum)` 元组定位"当前位置":

```ts
const currentIndex = source.videos.findIndex(v =>
  v.bvid === currentBvid && (v.partNum ?? null) === currentPartNum
);
```

切歌的返回值要带上 partNum(`{ bvid, partNum }` 而不是只 `bvid`),`triggerPlay` 调用方也跟着改。

### IPC

`IPC.SetCurrent` payload 加 `partNum?: number | null`,handler 写 config 时同时更新 `currentBvid` 和 `currentPartNum`。

## UI:SourceMenu

文件:`src/renderer/components/SourceMenu.tsx`

### 「选择合集」视图分组渲染

当前 `sources.map(s => ...)` 改成两段渲染:

```tsx
const grouped = {
  music: sources.filter(s => s.category === 'music'),
  learning: sources.filter(s => s.category === 'learning'),
};

return (
  <>
    {grouped.music.length > 0 && <CategoryHeader emoji="🎵" label="音乐" />}
    {grouped.music.map(renderSourceRow)}
    {grouped.learning.length > 0 && <CategoryHeader emoji="📖" label="英文学习" />}
    {grouped.learning.map(renderSourceRow)}
  </>
);
```

`CategoryHeader` 用现有 "选择合集" header 同款 12px 大写小字 + 0.5 letter-spacing。Source 行样式不变。空组连 header 都不出。

### 添加表单加 category 二选一

`+ 粘贴 URL 添加合集` 点开后,URL 输入框上方多一行 segmented control 风格的 [音乐] [英文学习] 二选一(state 默认 `'music'`):

```tsx
<div style={{display:'flex', gap:4, padding:'4px 4px 0', marginBottom: 4}}>
  <CategoryButton selected={cat==='music'}    onClick={() => setCat('music')}>🎵 音乐</CategoryButton>
  <CategoryButton selected={cat==='learning'} onClick={() => setCat('learning')}>📖 英文学习</CategoryButton>
</div>
<input ... />
```

`api.addSource` payload 加 `category`,IPC handler 把 `category` 写进新 source。

## Migration

完全靠 normalize 兜底,**不写 store 迁移代码**。`state.ts/hydrate` 拉 config 后跑一次:

```ts
function normalizeSource(s: any): Source {
  return {
    ...s,
    listType: s.listType ?? 'season',
    category: s.category ?? 'music',
  };
}

function normalizeConfig(c: any): Config {
  return {
    ...c,
    sources: (c.sources ?? []).map(normalizeSource),
    currentPartNum: c.currentPartNum ?? null,
  };
}
```

已有 4 个音乐 source 升级后:`category: 'music'` 自动填,看不出区别。

## 测试

### 单元测试

新增/扩展(`vitest`):

- `src/shared/bilibili-url.test.ts`:四种 URL × 多变种(裸 mid、`/video` 子路径、带 spm tracking、带 `?p=`、`type=collect` 拒收)
- `src/main/bilibili-api.test.ts`:`fetchVideoParts` happy path、`fetchUserUploads` happy path + 第二页翻页、错误码处理(传 mocked fetch)
- `src/renderer/playback.test.ts`:`pickNext` 在 parts source 下能按 `(bvid, partNum)` 正确找下一首,跨 source 切换不受影响

### 手动验证清单(PR 描述里)

- [ ] 粘 `bilibili.com/video/BV1Y7411n7iM/?spm_id_from=...` → 选「英文学习」→ 添加 → SourceMenu 出现一个 source,展开能看到 457 个 part(标题 `Improve Your English (1)..(457)`)
- [ ] 粘 `space.bilibili.com/3691000482499314?spm_id_from=...` → 选「英文学习」→ 添加 → SourceMenu 出现一个 source(名:`TA的视频 · UP-3691000482499314`),展开 99 条投稿。如果这步报 `code: -799`,说明 unsigned 端点被风控,需要回到 spec 补 wbi 签名
- [ ] 切到分P source 的第 5 part → BilibiliFrame src 含 `&p=5`、声音 / 画面对得上
- [ ] 自动切歌:parts source 跑完第 5 → 自动播第 6;UP 投稿 source 跑完一条 → 跑下一条
- [ ] 选择合集菜单:音乐组(老 4 个) header「🎵 音乐」+ 行,英文学习组下面同样,空组无 header
- [ ] 添加表单:不主动选 category 直接添加 → 默认进音乐组
- [ ] 升级:打开装了老版本(v0.1.2)生成 config 的 app,所有现有 source 自动落到音乐组,不丢、不重排

## 已知风险

- **B 站投稿 API wbi 风控**:`x/space/arc/search` unsigned 版本可能在某些时段被风控返回 `-799`。如果发生,需补 wbi 签名实现(约 80 行)。本期先走 unsigned,见招拆招。
- **分P source 的 mid 字段名义不符**:`source.mid` 在 parts 类型下没意义(留空字符串),不影响功能但破坏字段语义一致性。可接受,改名(`listKey` 之类)会破老 config。
- **UP 主名拉不到**:不签名的 `arc/search` 不返 UP 主名,本期 source 名靠 mid 兜底,可读性差。可以加调 `x/web-interface/card?mid=...` 取真名,但属于 nice-to-have,不进本期。

## 不在本期范围

- 跨句循环、AB 段重复、跟读特化交互
- 拖拽改 source 顺序
- 跨 category 拖拽 source
- 课程进度记录("我看到 part 137")
- 字幕显示控制
