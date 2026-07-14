import { useState, useEffect, useCallback } from 'react';

/*
  FRD B.3 - "a large Digital Clock starts on that table's image."
  Pure client-side ticking clock derived from the session's start_time
  (server-issued), so it stays accurate even if the tab was inactive.
*/
export default function LiveTimer({ elapsedMs, paused, startTime, pausedAt, pausedDurationMs }) {
  const calculateElapsed = useCallback(() => {
    if (!startTime) return elapsedMs || 0;
    const start = new Date(startTime).getTime();
    if (!Number.isFinite(start)) return 0;

    const nowMs = Date.now();
    const baseElapsed = Math.max(0, nowMs - start);
    const pausedDuration = Number(pausedDurationMs || 0);
    const pAt = pausedAt ? new Date(pausedAt).getTime() : null;

    if (pAt && pAt > start) {
      const currentPauseLength = Math.max(0, nowMs - pAt);
      return Math.max(0, baseElapsed - pausedDuration - currentPauseLength);
    }

    return Math.max(0, baseElapsed - pausedDuration);
  }, [elapsedMs, startTime, pausedAt, pausedDurationMs]);

  const [elapsed, setElapsed] = useState(calculateElapsed);

  useEffect(() => {
    setElapsed(calculateElapsed());
  }, [calculateElapsed]);

  useEffect(() => {
    if (paused) return undefined;
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);
    return () => clearInterval(interval);
  }, [paused, calculateElapsed]);

  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  const display = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  return (
    <div style={styles.clock} aria-label={`Elapsed time ${display}`}>
      {display}
    </div>
  );
}

const styles = {
  clock: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.7rem',
    fontWeight: 600,
    color: 'var(--brass-300)',
    letterSpacing: '0.02em',
  },
};
