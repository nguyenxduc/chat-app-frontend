import { avatarColor } from '../lib/avatarMeta';

type AvatarProps = {
  seed: string;
  initial: string;
  size?: number;
  online?: boolean;
  className?: string;
};

export function Avatar({ seed, initial, size = 40, online, className }: AvatarProps) {
  const bg = avatarColor(seed);
  return (
    <div
      className={`relative flex-shrink-0 flex items-center justify-center rounded-full font-semibold text-white select-none ${className ?? ''}`}
      style={{ width: size, height: size, background: bg, fontFamily: 'var(--font-family-display)', fontSize: size * 0.4 }}
    >
      {initial}
      {online != null && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2"
          style={{
            width: Math.max(size * 0.28, 8),
            height: Math.max(size * 0.28, 8),
            background: online ? '#4ade80' : '#6b7280',
            borderColor: '#16162a',
          }}
        />
      )}
    </div>
  );
}

type GroupAvatarProps = {
  seeds: string[];
  size?: number;
};

export function GroupAvatar({ seeds, size = 40 }: GroupAvatarProps) {
  const top2 = seeds.slice(0, 2);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {top2.map((seed, i) => {
        const sub = size * 0.65;
        return (
          <div
            key={seed}
            className="absolute flex items-center justify-center rounded-full border-2 text-white font-semibold"
            style={{
              width: sub,
              height: sub,
              background: avatarColor(seed),
              fontFamily: 'var(--font-family-display)',
              fontSize: sub * 0.4,
              borderColor: '#12121e',
              top: i === 0 ? 0 : undefined,
              bottom: i === 1 ? 0 : undefined,
              left: i === 0 ? 0 : undefined,
              right: i === 1 ? 0 : undefined,
            }}
          >
            {seed.slice(0, 1).toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}
