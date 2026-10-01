import { createContext, useContext } from 'react';

import { type MonthKey, monthShortLabel } from '../utils/month';

/**
 * The words a monthly board uses for its own period.
 *
 * On the current month a board's "today" figure is today's and its "this
 * month" is this month. Stepped back to an ended month, the server reads the
 * board as of that month's last day — so the same figure is 30 September's,
 * and saying "today" over it would be wrong in a way nobody standing at the
 * wall could catch. Every label that names the period reads it from here.
 *
 * A context rather than props, because the words are needed three components
 * deep (a tile, the donut inside it, the drill it opens) on boards whose
 * components were written long before months could change. Defaults to the
 * current month, so a component rendered outside a provider says exactly what
 * it always said.
 */
export interface BoardPeriod {
  /** The ended month on the board, or null on the current one. */
  pastMonth: MonthKey | null;
  /** "today", or "30 Sep" — for the middle of a sentence. */
  dayWord: string;
  /** "Today", or "30 Sep" — for a label. */
  DayWord: string;
  /** "this month", or "in Sep". */
  monthWord: string;
}

export const CURRENT_BOARD_PERIOD: BoardPeriod = {
  pastMonth: null,
  dayWord: 'today',
  DayWord: 'Today',
  monthWord: 'this month',
};

/** The words for a month as of its window's last day. */
export function boardPeriodFor(month: {
  month: MonthKey;
  to: string;
  isCurrent: boolean;
}): BoardPeriod {
  if (month.isCurrent) return CURRENT_BOARD_PERIOD;
  const day = Number(month.to.slice(8, 10));
  const short = monthShortLabel(month.month);
  return {
    pastMonth: month.month,
    dayWord: `${day} ${short}`,
    DayWord: `${day} ${short}`,
    monthWord: `in ${short}`,
  };
}

export const BoardPeriodContext = createContext<BoardPeriod>(CURRENT_BOARD_PERIOD);

/** The period words of the board this component is on. */
export function useBoardPeriod(): BoardPeriod {
  return useContext(BoardPeriodContext);
}
