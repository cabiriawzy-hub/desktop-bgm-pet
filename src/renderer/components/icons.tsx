// 控件条用的 inline SVG 图标。
// 设计基调：1.5px 描边、圆头、圆角拐点，部分元素实心补足视觉重量。
// stroke="currentColor" 让按钮文字颜色直接生效。

import type { CSSProperties } from 'react';

type Props = {
  size?: number;
  style?: CSSProperties;
  strokeWidth?: number;
};

const baseSvg = (size: number, strokeWidth: number, style?: CSSProperties) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  style,
});

export const IconPrev = ({ size = 18, strokeWidth = 1.5, style }: Props) => (
  <svg {...baseSvg(size, strokeWidth, style)}>
    <path d="M19 6 L9 12 L19 18 Z" fill="currentColor" stroke="currentColor" />
    <line x1="6" y1="6" x2="6" y2="18" />
  </svg>
);

export const IconNext = ({ size = 18, strokeWidth = 1.5, style }: Props) => (
  <svg {...baseSvg(size, strokeWidth, style)}>
    <path d="M5 6 L15 12 L5 18 Z" fill="currentColor" stroke="currentColor" />
    <line x1="18" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconPlay = ({ size = 20, strokeWidth = 1.5, style }: Props) => (
  <svg {...baseSvg(size, strokeWidth, style)}>
    <path d="M7 5 L19 12 L7 19 Z" fill="currentColor" stroke="currentColor" />
  </svg>
);

export const IconPause = ({ size = 20, strokeWidth = 1.5, style }: Props) => (
  <svg {...baseSvg(size, strokeWidth, style)}>
    <rect x="6.5" y="5" width="3.2" height="14" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="14.3" y="5" width="3.2" height="14" rx="1.2" fill="currentColor" stroke="none" />
  </svg>
);

// 顺序播放：一条带弧度的右箭头（不直愣愣的）
export const IconSequential = ({ size = 18, strokeWidth = 1.5, style }: Props) => (
  <svg {...baseSvg(size, strokeWidth, style)}>
    <path d="M3 12 Q12 8 20 12" />
    <path d="M16 8 L20 12 L16 16" />
  </svg>
);

// 随机：两条交叉的弧形箭头（X 形）
export const IconShuffle = ({ size = 18, strokeWidth = 1.5, style }: Props) => (
  <svg {...baseSvg(size, strokeWidth, style)}>
    <path d="M3 7 Q8 7 12 12 Q16 17 21 17" />
    <path d="M3 17 Q8 17 12 12 Q16 7 21 7" />
    <path d="M17 4 L21 7 L17 10" />
    <path d="M17 14 L21 17 L17 20" />
  </svg>
);

// 单曲循环：环形箭头中央一个 1
export const IconLoop = ({ size = 18, strokeWidth = 1.5, style }: Props) => (
  <svg {...baseSvg(size, strokeWidth, style)}>
    <path d="M17 7 H9 a5 5 0 1 0 0 10 h3" />
    <path d="M14 4 L17 7 L14 10" />
    <text x="12" y="14" textAnchor="middle" fontSize="7" fill="currentColor" stroke="none" fontWeight="600">1</text>
  </svg>
);

// 音量：圆角喇叭 + 两道半弧声波
export const IconVolume = ({ size = 18, strokeWidth = 1.5, style }: Props) => (
  <svg {...baseSvg(size, strokeWidth, style)}>
    <path d="M11 5 L6 9 H3 V15 H6 L11 19 Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />
    <path d="M15 8.5 Q17.5 12 15 15.5" />
    <path d="M18 5.5 Q21.5 12 18 18.5" />
  </svg>
);

// 静音：同一个喇叭 + 右侧叉叉
export const IconMute = ({ size = 18, strokeWidth = 1.5, style }: Props) => (
  <svg {...baseSvg(size, strokeWidth, style)}>
    <path d="M11 5 L6 9 H3 V15 H6 L11 19 Z" fill="currentColor" stroke="currentColor" />
    <line x1="16" y1="9" x2="21" y2="14" />
    <line x1="21" y1="9" x2="16" y2="14" />
  </svg>
);

// 合集：磁带（cassette）造型——BGM 主题的小彩蛋
export const IconLibrary = ({ size = 18, strokeWidth = 1.5, style }: Props) => (
  <svg {...baseSvg(size, strokeWidth, style)}>
    <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
    <circle cx="8" cy="12" r="2.2" />
    <circle cx="16" cy="12" r="2.2" />
    <line x1="8" y1="12" x2="16" y2="12" strokeWidth={Math.max(0.6, strokeWidth - 0.8)} />
  </svg>
);

// 收起按钮（标题栏右上）
export const IconFold = ({ size = 12, strokeWidth = 2, style }: Props) => (
  <svg {...baseSvg(size, strokeWidth, style)}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
