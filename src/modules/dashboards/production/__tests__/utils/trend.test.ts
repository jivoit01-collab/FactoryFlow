import { describe, expect, it } from 'vitest';

import { buildTrend, windowDays } from '../../utils/trend';

describe('windowDays', () => {
  it('gives every day in the window, oldest first', () => {
    const days = windowDays('2026-09-15', '2026-09-18');

    expect(days).toEqual(['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18']);
  });

  it('crosses a month end without losing a day', () => {
    expect(windowDays('2026-08-30', '2026-09-02')).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
    ]);
  });

  it('is empty rather than infinite when the dates are unreadable', () => {
    expect(windowDays('not a date', '2026-09-18')).toEqual([]);
  });
});

describe('buildTrend', () => {
  const rows = [
    { date: '2026-09-16', cases: 400 },
    { date: '2026-09-16', cases: 600 },
    { date: '2026-09-18', cases: 900 },
  ];
  const trend = () =>
    buildTrend({
      rows,
      from: '2026-09-15',
      to: '2026-09-18',
      valueOf: (row) => row.cases,
      shownValue: 2_460,
    });

  it('draws a bar for every day, including the ones nothing ran on', () => {
    // A strip that plotted only the days with runs would draw a busy fortnight
    // and a quiet one identically.
    expect(trend().map((point) => [point.date, point.value])).toEqual([
      ['2026-09-15', 0],
      ['2026-09-16', 1_000],
      ['2026-09-17', 0],
      ['2026-09-18', 2_460],
    ]);
  });

  it('takes the shown day from the board, not from the list', () => {
    // The list says 900 for the 18th; the board says 2,460 because its runs are
    // still open and their segments count. The last bar must match the tiles.
    const last = trend().at(-1)!;
    expect(last.value).toBe(2_460);
    expect(last.isShown).toBe(true);
  });

  it('marks only the shown day', () => {
    expect(trend().filter((point) => point.isShown)).toHaveLength(1);
  });

  it('ends on the day being shown, so a back-date walks the window', () => {
    const backDated = buildTrend({
      rows,
      from: '2026-09-14',
      to: '2026-09-16',
      valueOf: (row) => row.cases,
      shownValue: 1_000,
    });

    expect(backDated.map((point) => point.date)).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
    ]);
    expect(backDated.at(-1)?.value).toBe(1_000);
  });
});
