const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export function formatRelativeTime(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((then - now) / 1000);

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, 'second');
  }

  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute');
  }

  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) {
    return rtf.format(diffHr, 'hour');
  }

  const diffDay = Math.round(diffHr / 24);
  if (Math.abs(diffDay) < 7) {
    return rtf.format(diffDay, 'day');
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: new Date(iso).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  }).format(new Date(iso));
}

export function formatClockTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  );
}
