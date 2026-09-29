/**
 * The day sheet: one round of a day, every meter at once, in tree order.
 *
 * A day is read twice, by day and then by night. The opening is the previous
 * closing (the chain the split depends on), so only the closing is typed; units
 * are the dial difference times the meter's MF; and each parent says at once
 * whether its sub-meters fit inside it.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DaySheetTab } from '../components/electricity/DaySheetTab';
import type { DaySheetRow } from '../types';
import { DAY_SHEET } from './electricityTreeFixtures';

const save = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
const asked = vi.hoisted(() => ({ shifts: [] as string[] }));

vi.mock('../api', () => ({
  useElectricityDaySheet: (_date: string, shift: string) => {
    asked.shifts.push(shift);
    return { data: DAY_SHEET, isLoading: false };
  },
  useSaveElectricityDaySheet: () => ({ mutateAsync: save.mutateAsync, isPending: false }),
}));

/** Render with the first row's previous reading swapped for ``previous``. */
function renderOpeningOn(previous: DaySheetRow['previous']) {
  const was = DAY_SHEET.rows[0];
  DAY_SHEET.rows[0] = { ...was, previous };
  try {
    render(<DaySheetTab canAdd canEdit />);
  } finally {
    DAY_SHEET.rows[0] = was;
  }
}

const closing = (name: string) => screen.getByLabelText(`Closing for ${name}`) as HTMLInputElement;

describe('Day sheet', () => {
  beforeEach(() => {
    asked.shifts = [];
    save.mutateAsync.mockReset();
    save.mutateAsync.mockResolvedValue({ created: 1, updated: 0, sheet: DAY_SHEET });
  });

  it('lists the meters in tree order with their previous closing as the opening', () => {
    render(<DaySheetTab canAdd canEdit />);
    const names = screen.getAllByLabelText(/^Closing for /).map((input) => input.getAttribute('aria-label'));
    expect(names).toEqual(['Closing for KWH', 'Closing for Production Floor Beverage', 'Closing for Lab']);
    expect(screen.getByText('1000.00')).toBeInTheDocument();
  });

  it('multiplies the dial difference by the meter’s MF', () => {
    render(<DaySheetTab canAdd canEdit />);
    fireEvent.change(closing('KWH'), { target: { value: '1100' } });
    // 100 on the dial × MF 10.
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });

  it('shows what a parent has left after its sub-meters', () => {
    render(<DaySheetTab canAdd canEdit />);
    fireEvent.change(closing('Production Floor Beverage'), { target: { value: '5400' } });
    // 400 on the floor, the lab's 40 already entered.
    expect(screen.getByText('Sub-meters 40 · rest 360')).toBeInTheDocument();
  });

  it('says so when the sub-meters read more than their parent', () => {
    render(<DaySheetTab canAdd canEdit />);
    fireEvent.change(closing('Production Floor Beverage'), { target: { value: '5020' } });
    expect(screen.getByText('Sub-meters read 40 — 20 more than this meter')).toBeInTheDocument();
  });

  it('flags a closing below the opening', () => {
    render(<DaySheetTab canAdd canEdit />);
    fireEvent.change(closing('KWH'), { target: { value: '900' } });
    expect(screen.getByText('Closing is below the opening')).toBeInTheDocument();
  });

  it('locks a meter the user does not keep', () => {
    render(<DaySheetTab canAdd canEdit />);
    expect(closing('Lab').disabled).toBe(true);
    expect(closing('KWH').disabled).toBe(false);
  });

  it('locks an entered reading for a user who may only add', () => {
    const withReading = {
      ...DAY_SHEET.rows[0],
      reading: { id: 5, opening_reading: '1000.00', closing_reading: '1100.00', units_consumed: '1000.00', meter_reset: false, reading_time: null, remarks: '' },
    };
    DAY_SHEET.rows[0] = withReading;
    try {
      render(<DaySheetTab canAdd canEdit={false} />);
      expect(closing('KWH').disabled).toBe(true);
      expect(closing('Production Floor Beverage').disabled).toBe(false);
    } finally {
      DAY_SHEET.rows[0] = { ...withReading, reading: null };
    }
  });

  it('sends only the rows that changed', () => {
    render(<DaySheetTab canAdd canEdit />);
    fireEvent.change(closing('KWH'), { target: { value: '1100' } });
    fireEvent.click(screen.getByRole('button', { name: /save 1 reading/i }));
    expect(save.mutateAsync).toHaveBeenCalledWith({
      date: expect.any(String),
      shift: 'DAY',
      entries: [{ meter: 1, closing_reading: '1100', meter_reset: false, remarks: '' }],
    });
  });

  it('starts on the day shift and switches to the night', () => {
    render(<DaySheetTab canAdd canEdit />);
    const day = screen.getByRole('button', { name: /^day/i });
    const night = screen.getByRole('button', { name: /^night/i });
    expect(day).toHaveAttribute('aria-pressed', 'true');
    expect(asked.shifts.at(-1)).toBe('DAY');
    fireEvent.click(night);
    expect(night).toHaveAttribute('aria-pressed', 'true');
    expect(asked.shifts.at(-1)).toBe('NIGHT');
  });

  it('saves the night shift as the night', () => {
    render(<DaySheetTab canAdd canEdit />);
    fireEvent.click(screen.getByRole('button', { name: /^night/i }));
    fireEvent.change(closing('KWH'), { target: { value: '1100' } });
    fireEvent.click(screen.getByRole('button', { name: /save 1 reading/i }));
    expect(save.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ shift: 'NIGHT' }));
  });

  it('shows how many meters each shift has read', () => {
    render(<DaySheetTab canAdd canEdit />);
    expect(screen.getByRole('button', { name: /^day/i })).toHaveTextContent('1/3');
    expect(screen.getByRole('button', { name: /^night/i })).toHaveTextContent('0/3');
  });

  it('says nothing when a day opens on the night before', () => {
    render(<DaySheetTab canAdd canEdit />);
    expect(screen.queryByText(/night not read|last read/)).not.toBeInTheDocument();
  });

  it('says so when a day opens on the day before because the night was not read', () => {
    renderOpeningOn({ date: '2026-09-22', shift: 'DAY', closing_reading: '1000.00' });
    expect(screen.getByText('night not read')).toBeInTheDocument();
  });

  it('warns when the opening comes from further back', () => {
    renderOpeningOn({ date: '2026-09-20', shift: 'NIGHT', closing_reading: '1000.00' });
    expect(screen.getByText(/^last read 20 Sept? 2026, night$/)).toBeInTheDocument();
  });

  it('asks for an opening on a reset, and sends it', () => {
    render(<DaySheetTab canAdd canEdit />);
    fireEvent.click(screen.getByLabelText('Meter reset for KWH'));
    fireEvent.change(screen.getByLabelText('Opening for KWH'), { target: { value: '0' } });
    fireEvent.change(closing('KWH'), { target: { value: '50' } });
    // 50 on the new dial × MF 10.
    expect(screen.getByText('500')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save 1 reading/i }));
    expect(save.mutateAsync).toHaveBeenCalledWith({
      date: expect.any(String),
      shift: 'DAY',
      entries: [{ meter: 1, closing_reading: '50', opening_reading: '0', meter_reset: true, remarks: '' }],
    });
  });

  it('offers no save to somebody who may neither add nor correct', () => {
    render(<DaySheetTab canAdd={false} canEdit={false} />);
    expect(screen.queryByRole('button', { name: /^save/i })).not.toBeInTheDocument();
  });
});
