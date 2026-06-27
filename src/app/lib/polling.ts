/** Poll in background always; in foreground poll only when realtime is disconnected. */
export function refetchIntervalWithBackgroundBackup(
  realtimeConnected: boolean,
  visibleMs: number,
  hiddenMs: number,
): number | false {
  if (typeof document === 'undefined') {
    return visibleMs;
  }
  if (document.visibilityState === 'hidden') {
    return hiddenMs;
  }
  return realtimeConnected ? false : visibleMs;
}
