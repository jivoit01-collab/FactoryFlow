/**
 * The day sheet: one day's round, every meter at once, in tree order.
 *
 * The opening is the previous closing (the chain the split depends on), so only
 * the closing is typed; units are the dial difference times the meter's MF; and
 * each parent says at once whether its sub-meters fit inside it.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DaySheetTab } from '../components/electricity/DaySheetTab';
import { DAY_SHEET } from './electricityTreeFixtures';

const save = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock('../api', () => ({
  useElectricityDaySheet: () => ({ data: DAY_SHEET, isLoading: false }),
  useSaveElectricityDaySheet: () => ({ mutateAsync: save.mutateAsync, isPending: false }),
}));

const closing = (name: string) => screen.getByLabelText(`Closing for ${name}`) as HTMLInputElement;

describe('Day sheet', () => {
  beforeEach(() => {
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
      entries: [{ meter: 1, closing_reading: '1100', meter_reset: false, remarks: '' }],
    });
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
      entries: [{ meter: 1, closing_reading: '50', opening_reading: '0', meter_reset: true, remarks: '' }],
    });
  });

  it('offers no save to somebody who may neither add nor correct', () => {
    render(<DaySheetTab canAdd={false} canEdit={false} />);
    expect(screen.queryByRole('button', { name: /^save/i })).not.toBeInTheDocument();
  });
});
