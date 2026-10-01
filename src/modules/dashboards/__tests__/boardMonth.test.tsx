import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { type ReactNode, useEffect } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { boardPeriodFor } from '../hooks/boardPeriod.context';
import { BOARD_MONTH_AUTO_RETURN_MS, useBoardMonth } from '../hooks/useBoardMonth';
import { BoardEmbedProvider } from '../logistics-control/components/BoardEmbed';
import { OpsTopbar } from '../logistics-control/components/OpsTopbar';
import { daysInMonth, localISODate, monthLabel, monthWindow, shiftMonth } from '../utils/month';

describe('month helpers', () => {
  it('steps across a year in both directions', () => {
    expect(shiftMonth('2026-10', -1)).toBe('2026-09');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
    expect(shiftMonth('2026-03', -14)).toBe('2025-01');
  });

  it('knows how long a month is, leap years included', () => {
    expect(daysInMonth('2026-09')).toBe(30);
    expect(daysInMonth('2024-02')).toBe(29);
    expect(daysInMonth('2026-02')).toBe(28);
  });

  it('runs the current month to today and an ended one to its last day', () => {
    expect(monthWindow('2026-10', '2026-10-01')).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-01',
      isCurrent: true,
      daysElapsed: 1,
    });
    expect(monthWindow('2026-09', '2026-10-01')).toMatchObject({
      from: '2026-09-01',
      to: '2026-09-30',
      isCurrent: false,
      daysElapsed: 30,
    });
  });

  it('clamps a month that has not started to the current one', () => {
    expect(monthWindow('2026-11', '2026-10-01').month).toBe('2026-10');
  });

  it("reads the local calendar, not UTC's", () => {
    // 00:30 on 1 Oct, local: what a board in IST sees before 05:30.
    expect(localISODate(new Date(2026, 9, 1, 0, 30))).toBe('2026-10-01');
  });

  it('names a month in full', () => {
    expect(monthLabel('2026-09')).toBe('September 2026');
  });
});

describe('boardPeriodFor', () => {
  it('keeps the plain words on the current month', () => {
    expect(boardPeriodFor({ month: '2026-10', to: '2026-10-01', isCurrent: true })).toMatchObject({
      pastMonth: null,
      DayWord: 'Today',
      monthWord: 'this month',
    });
  });

  it("names an ended month's last day and the month", () => {
    const period = boardPeriodFor({ month: '2026-09', to: '2026-09-30', isCurrent: false });

    // The en-IN short month, which is "Sept" — the same spelling the boards'
    // clocks already print.
    expect(period.pastMonth).toBe('2026-09');
    expect(period.DayWord).toMatch(/^30 Sept?$/);
    expect(period.monthWord).toMatch(/^in Sept?$/);
  });
});

describe('useBoardMonth', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date(2026, 9, 1, 10, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** The hook, plus wherever it has sent the URL. */
  function setup(entry: string, options?: Parameters<typeof useBoardMonth>[0]) {
    const seen: { search: string } = { search: '' };
    function Spy() {
      const { search } = useLocation();
      useEffect(() => {
        seen.search = search;
      });
      return null;
    }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Spy />
        {children}
      </MemoryRouter>
    );
    const hook = renderHook(() => useBoardMonth(options), { wrapper });
    return { ...hook, seen };
  }

  it('opens on the current month with a clean URL', () => {
    const { result } = setup('/board');

    expect(result.current.month).toBe('2026-10');
    expect(result.current.isCurrent).toBe(true);
    expect(result.current.canGoForward).toBe(false);
  });

  it('steps back a month and says so in the URL', () => {
    const { result, seen } = setup('/board');

    act(() => result.current.previous());

    expect(result.current.month).toBe('2026-09');
    expect(result.current.to).toBe('2026-09-30');
    expect(result.current.today).toBe('2026-10-01');
    expect(seen.search).toBe('?month=2026-09');
  });

  it('never writes the current month into the URL', () => {
    const { result, seen } = setup('/board?month=2026-09');

    act(() => result.current.next());

    expect(result.current.isCurrent).toBe(true);
    expect(seen.search).toBe('');
  });

  it('reads a month that has not started as the current one', () => {
    const { result } = setup('/board?month=2027-01');

    expect(result.current.month).toBe('2026-10');
  });

  it('pinned, it ignores the URL — a carousel slide is always this month', () => {
    const { result } = setup('/carousel?month=2026-09', { locked: true });

    expect(result.current.month).toBe('2026-10');
    act(() => result.current.previous());
    expect(result.current.month).toBe('2026-10');
  });

  it('returns to the current month after thirty idle minutes', () => {
    const { result } = setup('/board?month=2026-09');

    act(() => {
      vi.advanceTimersByTime(BOARD_MONTH_AUTO_RETURN_MS - 1000);
    });
    expect(result.current.month).toBe('2026-09');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.month).toBe('2026-10');
  });

  it('starts the thirty minutes again whenever somebody uses the page', () => {
    const { result } = setup('/board?month=2026-09');

    act(() => {
      vi.advanceTimersByTime(20 * 60_000);
      window.dispatchEvent(new Event('keydown'));
      vi.advanceTimersByTime(20 * 60_000);
    });
    // Forty minutes in, but only twenty since the key press.
    expect(result.current.month).toBe('2026-09');
  });
});

describe('the wall header month control', () => {
  const month = (overrides: Partial<Parameters<typeof OpsTopbar>[0]['month'] & object> = {}) => ({
    label: 'September 2026',
    isCurrent: false,
    canGoForward: true,
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    ...overrides,
  });

  it('steps both ways and marks an ended month', () => {
    const control = month();
    render(
      <MemoryRouter>
        <OpsTopbar title="Board" scope="" month={control} chips={[]} totals={[]} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(control.onPrevious).toHaveBeenCalledOnce();
    expect(control.onNext).toHaveBeenCalledOnce();
    expect(screen.getByText('September 2026').closest('.ops-month')).toHaveAttribute(
      'data-past',
      '1',
    );
  });

  it('cannot step past the current month', () => {
    render(
      <MemoryRouter>
        <OpsTopbar
          title="Board"
          scope=""
          month={month({ label: 'October 2026', isCurrent: true, canGoForward: false })}
          chips={[]}
          totals={[]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });

  it('steps on a carousel slide too', () => {
    // The carousel used to pin its slides to the current month; the month is
    // now the carousel page's own ?month=, so the arrows work there as well.
    const control = month();
    render(
      <MemoryRouter>
        <BoardEmbedProvider>
          <OpsTopbar title="Board" scope="" month={control} chips={[]} totals={[]} />
        </BoardEmbedProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(control.onPrevious).toHaveBeenCalledOnce();
  });
});
