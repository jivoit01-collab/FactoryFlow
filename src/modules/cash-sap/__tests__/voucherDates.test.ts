import { describe, expect, it } from 'vitest';

import {
  addDays,
  checkVoucherDates,
  fmt,
  humanDate,
  isFutureDate,
  today,
  VOUCHER_AGE_WARNING_DAYS,
  voucherDateWarnings,
} from '../utils/voucherDates';

/**
 * The same cases as `factory_app/cash_sap/tests_voucher_dates.py`, so the
 * dialog's warnings and the server's cannot drift apart unnoticed. `today` is
 * always injected.
 */
const TODAY = '2026-10-09';

const codes = (warnings: { code: string }[]) => warnings.map((w) => w.code);

describe('today()', () => {
  it('is built from the local date parts, never the UTC date', () => {
    // 00:30 on 10 Oct in local time. In India the UTC date of this moment is
    // still 9 Oct, which is the cash book's `toISOString()` bug.
    const lateNight = new Date(2026, 9, 10, 0, 30);
    expect(today(lateNight)).toBe('2026-10-10');
  });

  it('pads month and day', () => {
    expect(today(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});

describe('checkVoucherDates', () => {
  it('refuses a future voucher date with its field', () => {
    expect(checkVoucherDates('2026-10-10', null, TODAY)).toHaveProperty('entry_date');
  });

  it('refuses a future bill date with its field', () => {
    expect(checkVoucherDates('2026-10-01', '2026-10-12', TODAY)).toHaveProperty('bill_date');
  });

  it('accepts today and the past', () => {
    expect(checkVoucherDates(TODAY, TODAY, TODAY)).toEqual({});
    expect(checkVoucherDates('2026-01-01', null, TODAY)).toEqual({});
  });
});

describe('voucherDateWarnings', () => {
  it('has nothing to say about a clean recent voucher', () => {
    expect(voucherDateWarnings('2026-10-01', null, { today: TODAY })).toEqual([]);
  });

  it('warns about old dates only with the age check on', () => {
    expect(codes(voucherDateWarnings('2026-07-20', null, { today: TODAY }))).toEqual(['DATE_OLD']);
    expect(voucherDateWarnings('2026-07-20', null, { today: TODAY, includeAge: false })).toEqual(
      [],
    );
  });

  it('counts the age in whole days, more than 45 warns', () => {
    const edge = addDays(TODAY, -VOUCHER_AGE_WARNING_DAYS);
    const past = addDays(TODAY, -(VOUCHER_AGE_WARNING_DAYS + 1));
    expect(codes(voucherDateWarnings(edge, null, { today: TODAY }))).not.toContain('DATE_OLD');
    expect(codes(voucherDateWarnings(past, null, { today: TODAY }))).toContain('DATE_OLD');
  });

  it('flags a bill after the voucher and in another month', () => {
    const got = codes(voucherDateWarnings('2026-09-30', '2026-10-02', { today: TODAY }));
    expect(got).toContain('BILL_AFTER_ENTRY');
    expect(got).toContain('BILL_OTHER_MONTH');
  });

  it('flags day and month that look swapped, naming the likelier date', () => {
    // 09/05 read as 9 May is months old; 5 September is recent.
    const got = voucherDateWarnings('2026-05-09', null, { today: TODAY, includeAge: false });
    expect(codes(got)).toEqual(['LOOKS_SWAPPED']);
    expect(got[0].message).toContain('05 Sep 2026');
    expect(got[0].field).toBe('entry_date');
  });

  it('words its messages exactly as the server does', () => {
    const [old] = voucherDateWarnings('2026-07-20', null, { today: TODAY });
    expect(old.message).toBe('Voucher date 20 Jul 2026 is more than 45 days ago — check it.');
    const after = voucherDateWarnings('2026-10-01', '2026-10-03', { today: TODAY });
    expect(after.find((w) => w.code === 'BILL_AFTER_ENTRY')?.message).toBe(
      'The bill is dated 03 Oct 2026 — after the voucher date 01 Oct 2026.',
    );
  });

  it('defaults the age check on, as voucher_date_warnings does', () => {
    expect(codes(voucherDateWarnings('2026-07-20', undefined, { today: TODAY }))).toEqual([
      'DATE_OLD',
    ]);
  });
});

describe('date helpers', () => {
  it('formats like the server, independent of locale', () => {
    expect(fmt('2026-09-03')).toBe('03 Sep 2026');
  });

  it('names the weekday from the date itself', () => {
    expect(humanDate('2026-10-07')).toBe('Wed 7 Oct 2026');
  });

  it('knows a future date', () => {
    expect(isFutureDate('2026-10-10', TODAY)).toBe(true);
    expect(isFutureDate(TODAY, TODAY)).toBe(false);
    expect(isFutureDate('', TODAY)).toBe(false);
  });
});
