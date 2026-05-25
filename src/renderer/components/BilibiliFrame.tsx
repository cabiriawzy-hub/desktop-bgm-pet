// src/renderer/components/BilibiliFrame.tsx
type Props = { bvid: string; epoch: number };

export function BilibiliFrame({ bvid, epoch }: Props) {
  const src = `//player.bilibili.com/player.html?bvid=${bvid}&autoplay=1&danmaku=0&hideCoverInfo=1`;
  return (
    <iframe
      // key 包含 epoch：换歌时 bvid 变；loop 模式同一首重播时 epoch 变。
      // 两种情况都触发 iframe 重新加载。
      key={`${bvid}-${epoch}`}
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
