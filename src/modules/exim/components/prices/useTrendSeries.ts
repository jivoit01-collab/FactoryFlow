/**
 * A trend's series: each name with its colour, which are drawn, and the figures
 * the chart, the tables and the spreadsheet share.
 *
 * Until the reader switches a line on or off, the drawn set is `defaults` of
 * whatever the range holds; once they do, it is theirs, and survives a change
 * of range or figure. Colours follow a series' place in `names`, never its
 * place among those drawn.
 */
import { useCallback, useMemo, useState } from 'react';

import { useTheme } from '@/shared/contexts';

import { type Point, rowsByDay, seriesFor, statsOf } from './priceFormat';

export function useTrendSeries(
  /** Every series the range holds, in the order they are listed. Memoised. */
  names: string[],
  points: Point[],
  /** The series drawn before the reader chooses. A stable function. */
  defaults: (names: string[]) => string[],
) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const [picked, setPicked] = useState<string[] | null>(null);

  const series = useMemo(() => seriesFor(names, dark), [names, dark]);
  const selected = useMemo(() => new Set(picked ?? defaults(names)), [picked, names, defaults]);
  const drawn = useMemo(() => series.filter((s) => selected.has(s.key)), [series, selected]);
  const stats = useMemo(() => statsOf(points), [points]);
  const rows = useMemo(() => {
    const slots = new Map(series.map((s) => [s.key, s.slot]));
    return rowsByDay(points, (key) => slots.get(key));
  }, [points, series]);

  const toggle = useCallback(
    (key: string) =>
      setPicked((current) => {
        const base = current ?? defaults(names);
        return base.includes(key) ? base.filter((k) => k !== key) : [...base, key];
      }),
    [defaults, names],
  );
  const showAll = useCallback(() => setPicked(names), [names]);
  const showNone = useCallback(() => setPicked([]), []);

  return { series, selected, drawn, stats, rows, toggle, showAll, showNone };
}
