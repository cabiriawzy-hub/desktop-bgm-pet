import { describe, it, expect, vi } from 'vitest';
import { getMixinKey, signQuery, fetchWbiKeys } from './wbi';

function mockJsonResponse(data: any) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(data),
    json: async () => data,
  } as unknown as Response;
}

describe('getMixinKey', () => {
  it('returns 32 chars by permuting input via MIXIN_KEY_ENC_TAB', () => {
    // 64 distinct chars input — easy to check first few output positions
    const input = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-_';
    const out = getMixinKey(input);
    expect(out).toHaveLength(32);
    // First output char = input[46] = 'K' (per the table)
    expect(out[0]).toBe(input[46]);
    expect(out[1]).toBe(input[47]);
    expect(out[2]).toBe(input[18]);
  });

  it('handles short input gracefully (only in-bounds indices contribute)', () => {
    // 'abc' has length 3; MIXIN_KEY_ENC_TAB contains indices 0, 1, 2 at positions
    // 42, 43, 2 respectively, so those map to 'a', 'b', 'c'. All other indices are
    // out of bounds and produce ''. The join then slices to 32, giving length 3.
    const result = getMixinKey('abc');
    expect(result.length).toBeLessThanOrEqual(32);
    // Every char that came through must be from the original input
    for (const ch of result) {
      expect('abc').toContain(ch);
    }
  });
});

describe('signQuery', () => {
  it('returns sorted query with wts and w_rid appended', () => {
    const out = signQuery({ mid: '123', pn: 1 }, 'fakemixinkey0123456789abcdef0123', 1700000000);
    // Expect sorted keys mid, pn, wts and an MD5 w_rid suffix
    expect(out).toMatch(/^mid=123&pn=1&wts=1700000000&w_rid=[0-9a-f]{32}$/);
  });

  it("strips !'()* from param values before encoding", () => {
    const out = signQuery({ q: "a!b'c(d)e*f" }, 'k'.repeat(32), 1700000000);
    // sanitized value should be 'abcdef' (encoded same since no special chars left)
    expect(out).toContain('q=abcdef');
  });

  it('produces deterministic w_rid for same input', () => {
    const a = signQuery({ x: '1' }, 'k'.repeat(32), 1700000000);
    const b = signQuery({ x: '1' }, 'k'.repeat(32), 1700000000);
    expect(a).toBe(b);
  });
});

describe('fetchWbiKeys', () => {
  it('extracts basename (no extension) of img_url and sub_url', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({
      code: 0,
      data: {
        wbi_img: {
          img_url: 'https://i0.hdslb.com/bfs/wbi/abcd1234.png',
          sub_url: 'https://i0.hdslb.com/bfs/wbi/efgh5678.png',
        },
      },
    }));
    const keys = await fetchWbiKeys(mockFetch);
    expect(keys).toEqual({ imgKey: 'abcd1234', subKey: 'efgh5678' });
  });

  it('throws on bad response', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(mockJsonResponse({ code: -101 }));
    await expect(fetchWbiKeys(mockFetch)).rejects.toThrow(/nav API/);
  });

  it('throws a helpful error when response is HTML (not JSON)', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '<!DOCTYPE html><html>...',
    } as unknown as Response);
    await expect(fetchWbiKeys(mockFetch)).rejects.toThrow(/非 JSON/);
  });
});
