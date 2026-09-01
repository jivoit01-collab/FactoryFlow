import { createContext, useContext } from 'react';

export interface BoardDay {
  /** The day the board is showing, local YYYY-MM-DD. */
  date: string;
  /** The real today, whatever the board happens to be showing. */
  today: string;
  /** False the moment somebody back-dates the board — the whole screen keys
   *  its "is this live" behaviour off this one flag. */
  isToday: boolean;
  /** The day before the shown day — the baseline every "vs" chip compares to. */
  previous: string;
  /** Fulfilment window for the trend chart, ending on the shown day. */
  trendFrom: string;
  /** Look-back for the late-on-road count. */
  trackingFrom: string;
  /** Look-back for the docking register. */
  dockingFrom: string;
  /**
   * The instant the shown day ends. Dwell times are measured to
   * `min(now, endOfDay)`, so "inside 4h 20m" keeps counting on today and freezes
   * at the closing figure on any past day.
   */
  endOfDay: number;
  setDate: (iso: string) => void;
  resetToToday: () => void;
}

/**
 * Split from the provider on purpose: a module that exports both a component and
 * a hook breaks fast refresh, and the context object itself is not a component.
 */
export const BoardDayContext = createContext<BoardDay | null>(null);

/** The day the board is on. Must be called under `BoardDayProvider`. */
export function useBoardDay(): BoardDay {
  const value = useContext(BoardDayContext);
  if (!value) {
    throw new Error('useBoardDay must be used within a BoardDayProvider');
  }
  return value;
}
