/** First letter of a person's real display name. */
export function initialFromName(displayName: string): string {
  const trimmed = displayName.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : '?';
}

/** Stable fallback initial derived from a UUID — only used before a profile loads. */
export function initialFromUserId(userId: string): string {
  const hex = userId.replace(/-/g, '');
  if (hex.length < 4) {
    return '?';
  }
  const n = parseInt(hex.slice(-4), 16);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return alphabet[n % alphabet.length] ?? '?';
}

const AVATAR_PALETTE = ['#7c5cbf', '#38bdf8', '#f472b6', '#ff8906', '#4ade80', '#fb923c', '#a78bfa', '#f87171'];

/** Deterministic color from a seed string (userId), matching the Helix palette. */
export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
  }
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]!;
}
