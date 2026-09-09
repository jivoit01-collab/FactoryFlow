import { describe, expect, it } from 'vitest';

import { lineSpeedOf, lineSpeedReason } from './lineSpeed';

describe('lineSpeedOf', () => {
  it('computes bottles per hour against rated speed', () => {
    // Clear Pack, 2026-09-07: 1,076 cases x 20 pieces over 605 minutes,
    // rated 4,800 bottles/hr -> 2,134 b/hr, 44.5%.
    const speed = lineSpeedOf({
      cases: 1076,
      piecesPerCase: 20,
      runningMinutes: 605,
      ratedSpeed: 4800,
    });
    expect(Math.round(speed.actual!)).toBe(2134);
    expect(speed.percent).toBeCloseTo(44.5, 1);
    expect(speed.reason).toBe('ok');
  });

  it('caps at 100% rather than reporting a line beating its rating', () => {
    const speed = lineSpeedOf({
      cases: 1000,
      piecesPerCase: 20,
      runningMinutes: 60,
      ratedSpeed: 1000,
    });
    expect(speed.percent).toBe(100);
  });

  it('returns no-output, not zero, for a line that has not booked cases', () => {
    // JP Machine: open segment 435 minutes, 0 cases entered. A 0% here would
    // read as a dead line on the wall.
    const speed = lineSpeedOf({
      cases: 0,
      piecesPerCase: 20,
      runningMinutes: 435,
      ratedSpeed: 5400,
    });
    expect(speed.percent).toBeNull();
    expect(speed.actual).toBeNull();
    expect(speed.reason).toBe('no-output');
  });

  it('returns no-runtime before the line has run', () => {
    const speed = lineSpeedOf({
      cases: 0,
      piecesPerCase: 20,
      runningMinutes: 0,
      ratedSpeed: 4800,
    });
    expect(speed.reason).toBe('no-runtime');
    expect(speed.percent).toBeNull();
  });

  it('still reports achieved speed when no rating exists to compare against', () => {
    const speed = lineSpeedOf({
      cases: 100,
      piecesPerCase: 20,
      runningMinutes: 60,
      ratedSpeed: null,
    });
    expect(speed.actual).toBe(2000);
    expect(speed.rated).toBeNull();
    expect(speed.percent).toBeNull();
    expect(speed.reason).toBe('no-rated-speed');
  });

  it('falls back to one piece per case, matching the backend CSD rule', () => {
    const speed = lineSpeedOf({
      cases: 600,
      piecesPerCase: null,
      runningMinutes: 60,
      ratedSpeed: 600,
    });
    expect(speed.actual).toBe(600);
    expect(speed.percent).toBe(100);
  });

  it('handles every field being null without throwing or returning NaN', () => {
    const speed = lineSpeedOf({
      cases: null,
      piecesPerCase: null,
      runningMinutes: null,
      ratedSpeed: null,
    });
    expect(speed).toEqual({ actual: null, rated: null, percent: null, reason: 'no-runtime' });
  });
});

describe('lineSpeedReason', () => {
  it('explains each unmeasurable case in words', () => {
    expect(lineSpeedReason('no-output')).toBe('No output booked yet');
    expect(lineSpeedReason('no-runtime')).toBe('No running time yet');
    expect(lineSpeedReason('no-rated-speed')).toBe('No rated speed set');
  });

  it('says nothing when the speed is fine', () => {
    expect(lineSpeedReason('ok')).toBe('');
  });
});
