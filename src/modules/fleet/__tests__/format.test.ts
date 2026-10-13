import { describe, expect, it } from 'vitest';

import {
  dateTime,
  fieldErrors,
  km,
  money,
  quantity,
  rupees,
  shortDate,
  shortTime,
  timeInput,
} from '../utils/format';

describe('fleet formatting', () => {
  it('shows a bill as whole rupees', () => {
    expect(money('4500.75')).toBe('₹4,501');
  });

  it('keeps the paise on a rate, where they are the point', () => {
    expect(rupees('90.5')).toBe('₹90.50');
  });

  it('says nothing rather than zero when a figure is missing', () => {
    expect(rupees(null)).toBe('—');
    expect(km(null)).toBe('—');
    expect(quantity('', 'L')).toBe('—');
    expect(shortDate(null)).toBe('—');
  });

  it('labels a quantity with the unit it was sold in', () => {
    expect(quantity('12.5', 'Kg')).toBe('12.5 Kg');
  });

  it('reads a date the way a person writes one', () => {
    // Day, month name, year — not the ISO string. The exact abbreviation is
    // the runtime's ('Sep' or 'Sept' depending on its ICU data), so the shape
    // is asserted rather than the spelling.
    expect(shortDate('2026-09-23')).toMatch(/^23 Sept? 2026$/);
  });

  it('hands back an unparseable date unchanged rather than showing rubbish', () => {
    expect(shortDate('not-a-date')).toBe('not-a-date');
  });

  it('reads a time on the twelve-hour clock', () => {
    expect(shortTime('14:05:00')).toBe('2:05 pm');
    expect(shortTime('09:30')).toBe('9:30 am');
    expect(shortTime('00:15:00')).toBe('12:15 am');
    expect(shortTime('12:00:00')).toBe('12:00 pm');
  });

  it('puts the time after the date, or leaves it off where none was recorded', () => {
    expect(dateTime('2026-09-23', '14:05:00')).toMatch(/^23 Sept? 2026, 2:05 pm$/);
    expect(dateTime('2026-09-23', null)).toMatch(/^23 Sept? 2026$/);
    expect(dateTime('2026-09-23', undefined)).toMatch(/^23 Sept? 2026$/);
  });

  it('gives a time box the hours and minutes only', () => {
    expect(timeInput('14:05:00')).toBe('14:05');
    expect(timeInput(null)).toBe('');
  });
});

describe('fieldErrors', () => {
  it('flattens DRF field errors to one message each', () => {
    expect(
      fieldErrors({ errors: { odometer: ['Last reading was 42180 km.', 'and again'] } }),
    ).toEqual({ odometer: 'Last reading was 42180 km.' });
  });

  it('files a non-field error under general, where the form looks for it', () => {
    expect(fieldErrors({ errors: { non_field_errors: ['Nope'] } })).toEqual({ general: 'Nope' });
  });

  it('falls back to detail when the server sent no field errors', () => {
    expect(fieldErrors({ detail: 'This entry is approved.' })).toEqual({
      general: 'This entry is approved.',
    });
  });
});
