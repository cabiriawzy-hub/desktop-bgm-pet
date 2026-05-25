// src/renderer/components/BilibiliFrame.tsx
type Props = { bvid: string };

export function BilibiliFrame({ bvid }: Props) {
  const src = `//player.bilibili.com/player.html?bvid=${bvid}&autoplay=1&danmaku=0&hideCoverInfo=1`;
  return (
    <iframe
      key={bvid}                 /* key 确保切歌时重新加载 */
      src={src}
      allow="autoplay; fullscreen"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      }}
    />
  );
}
