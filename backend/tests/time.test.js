import test from 'node:test';
import assert from 'node:assert/strict';
import { getEffectiveElapsedMs } from '../src/utils/time.js';

test('subtracts paused duration from an active session', () => {
  const session = {
    startTime: new Date('2024-01-01T00:00:00.000Z'),
    pausedDurationMs: 60_000,
    pausedAt: null,
  };

  const elapsed = getEffectiveElapsedMs(session, new Date('2024-01-01T00:03:00.000Z'));
  assert.equal(elapsed, 120_000);
});

test('excludes the current paused interval from elapsed time', () => {
  const session = {
    startTime: new Date('2024-01-01T00:00:00.000Z'),
    pausedDurationMs: 60_000,
    pausedAt: new Date('2024-01-01T00:02:00.000Z'),
  };

  const elapsed = getEffectiveElapsedMs(session, new Date('2024-01-01T00:03:00.000Z'));
  assert.equal(elapsed, 60_000);
});
