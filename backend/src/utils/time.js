export function getEffectiveElapsedMs(session, now = new Date()) {
  const start = new Date(session.startTime).getTime();
  if (!Number.isFinite(start)) return 0;

  const nowMs = new Date(now).getTime();
  const baseElapsed = Math.max(0, nowMs - start);
  const pausedDuration = Number(session.pausedDurationMs || 0);
  const pausedAt = session.pausedAt ? new Date(session.pausedAt).getTime() : null;

  if (pausedAt && pausedAt > start) {
    const currentPauseLength = Math.max(0, nowMs - pausedAt);
    return Math.max(0, baseElapsed - pausedDuration - currentPauseLength);
  }

  return Math.max(0, baseElapsed - pausedDuration);
}
