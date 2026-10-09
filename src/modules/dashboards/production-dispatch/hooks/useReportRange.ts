import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useNow } from '../../dispatch/hooks';
import { localISODate } from '../../utils/month';
import {
  type PresetKey,
  presetOf,
  presetRange,
  rangeLabel,
  type ReportRange,
  resolveRange,
} from '../utils/range';

export interface ReportRangeControls extends ReportRange {
  today: string;
  label: string;
  preset: PresetKey | null;
  setRange: (range: ReportRange) => void;
  setPreset: (key: PresetKey) => void;
}

/**
 * The days the report covers, kept in the URL. See `utils/range.ts`.
 */
export function useReportRange(): ReportRangeControls {
  const [searchParams, setSearchParams] = useSearchParams();
  // Read every minute, so a page left open past midnight moves "today" on.
  const today = localISODate(useNow(60_000));

  const rawFrom = searchParams.get('from');
  const rawTo = searchParams.get('to');
  const range = useMemo(
    () => resolveRange({ from: rawFrom, to: rawTo }, today),
    [rawFrom, rawTo, today],
  );

  const write = useCallback(
    (next: ReportRange) => {
      const resolved = resolveRange(next, today);
      const isDefault = presetOf(resolved, today) === 'this-month';
      setSearchParams(
        (params) => {
          const out = new URLSearchParams(params);
          if (isDefault) {
            out.delete('from');
            out.delete('to');
          } else {
            out.set('from', resolved.from);
            out.set('to', resolved.to);
          }
          return out;
        },
        { replace: true },
      );
    },
    [setSearchParams, today],
  );

  return useMemo(
    () => ({
      ...range,
      today,
      label: rangeLabel(range),
      preset: presetOf(range, today),
      setRange: (next) => write(next),
      setPreset: (key) => write(presetRange(key, today)),
    }),
    [range, today, write],
  );
}
