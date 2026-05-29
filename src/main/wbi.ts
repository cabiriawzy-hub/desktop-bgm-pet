// src/main/wbi.ts
//
// B 站 web API wbi 签名。算法是公开逆向出的:
// 1. /x/web-interface/nav 拿 img_key + sub_key
// 2. 按 MIXIN_KEY_ENC_TAB 重排 (img_key + sub_key) 取前 32 字符 → mixin_key
// 3. 把请求参数加 wts、按 key 排序、URL-encode、拼接,末尾追加 mixin_key,MD5 → w_rid
// 4. 把 w_rid 加回 query
//
// 详见 https://socialsisteryi.github.io/bilibili-API-collect/docs/misc/sign/wbi.html
import { createHash } from 'crypto';

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

export function getMixinKey(orig: string): string {
  return MIXIN_KEY_ENC_TAB.map(i => orig[i] ?? '').join('').slice(0, 32);
}

type Fetcher = (url: string, options: any) => Promise<Response>;

type NavResponse = {
  code: number;
  data?: {
    wbi_img: { img_url: string; sub_url: string };
  };
};

export type WbiKeys = { imgKey: string; subKey: string };

/** 从 nav 端点拉 wbi 用的两把 key(URL basename 去扩展名)。 */
export async function fetchWbiKeys(fetcher: Fetcher): Promise<WbiKeys> {
  const res = await fetcher('https://api.bilibili.com/x/web-interface/nav', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.bilibili.com/',
      'Origin': 'https://www.bilibili.com',
    },
  });
  const text = await res.text();
  let json: NavResponse;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `B 站 nav API 返回非 JSON (HTTP ${res.status},前 80 字符: ${text.slice(0, 80)})`
    );
  }
  if (!json.data?.wbi_img) {
    throw new Error(`B 站 nav API 失败 (code=${json.code})`);
  }
  const { img_url, sub_url } = json.data.wbi_img;
  const imgKey = basenameNoExt(img_url);
  const subKey = basenameNoExt(sub_url);
  return { imgKey, subKey };
}

function basenameNoExt(url: string): string {
  const tail = url.split('/').pop() ?? '';
  const dot = tail.lastIndexOf('.');
  return dot === -1 ? tail : tail.slice(0, dot);
}

/** 用 mixinKey 给一组 query 参数签名,返回拼好可直接挂 ?后面的查询串(含 wts + w_rid)。
 *  `now` 参数仅用于测试时注入固定时间戳,生产代码不要传。 */
export function signQuery(
  params: Record<string, string | number>,
  mixinKey: string,
  now: number = Math.floor(Date.now() / 1000),
): string {
  const all: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    all[k] = String(v);
  }
  all.wts = String(now);

  const sortedKeys = Object.keys(all).sort();
  const sanitized = sortedKeys
    .map(k => {
      const cleanV = all[k].replace(/[!'()*]/g, '');
      return `${encodeURIComponent(k)}=${encodeURIComponent(cleanV)}`;
    })
    .join('&');

  const w_rid = createHash('md5').update(sanitized + mixinKey).digest('hex');
  return `${sanitized}&w_rid=${w_rid}`;
}
