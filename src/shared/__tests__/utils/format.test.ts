import { describe, it, expect, vi } from 'vitest';

vi.mock('@/config/constants', () => ({
  APP_DEFAULTS: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  },
}));

import {
  formatDate,
  formatTime,
  formatDateTime,
  formatDateTimeShort,
  formatDateTimeFull,
  formatNumber,
  formatCurrency,
} from '../../utils/format';

describe('Format Utilities', () => {
  // ═══════════════════════════════════════════════════════════════
  // formatDate
  // ═══════════════════════════════════════════════════════════════

  describe('formatDate', () => {
    it('formats a Date object with default format (DD/MM/YYYY)', () => {
      const date = new Date(2026, 0, 15); // Jan 15, 2026
      expect(formatDate(date)).toBe('15/01/2026');
    });

    it('formats a string date', () => {
      const result = formatDate('2026-03-05T00:00:00');
      expect(result).toBe('05/03/2026');
    });

    it('formats with custom format string', () => {
      const date = new Date(2026, 11, 25); // Dec 25, 2026
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2026-12-25');
    });

    it('pads single-digit day and month', () => {
      const date = new Date(2026, 0, 5); // Jan 5, 2026
      expect(formatDate(date)).toBe('05/01/2026');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // formatTime
  // ═══════════════════════════════════════════════════════════════

  describe('formatTime', () => {
    it('formats a Date object with default format (HH:mm)', () => {
      const date = new Date(2026, 0, 15, 14, 30, 0);
      expect(formatTime(date)).toBe('14:30');
    });

    it('formats a string date', () => {
      const date = new Date(2026, 0, 15, 9, 5, 0);
      expect(formatTime(date)).toBe('09:05');
    });

    it('formats with custom format including seconds', () => {
      const date = new Date(2026, 0, 15, 14, 30, 45);
      expect(formatTime(date, 'HH:mm:ss')).toBe('14:30:45');
    });

    it('pads single-digit hours and minutes', () => {
      const date = new Date(2026, 0, 15, 3, 7, 0);
      expect(formatTime(date)).toBe('03:07');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // formatDateTime
  // ═══════════════════════════════════════════════════════════════

  describe('formatDateTime', () => {
    it('combines date and time formatting', () => {
      const date = new Date(2026, 0, 15, 14, 30, 0);
      expect(formatDateTime(date)).toBe('15/01/2026 14:30');
    });

    it('works with string input', () => {
      const result = formatDateTime('2026-06-20T09:15:00');
      expect(result).toBe('20/06/2026 09:15');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // formatDateTimeShort
  // ═══════════════════════════════════════════════════════════════

  describe('formatDateTimeShort', () => {
    it('returns "-" for null input', () => {
      expect(formatDateTimeShort(null)).toBe('-');
    });

    it('returns "-" for undefined input', () => {
      expect(formatDateTimeShort(undefined)).toBe('-');
    });

    it('returns "-" for empty string input', () => {
      expect(formatDateTimeShort('')).toBe('-');
    });

    it('returns "-" for invalid date string', () => {
      expect(formatDateTimeShort('not-a-date')).toBe('-');
    });

    it('formats a valid date string', () => {
      const result = formatDateTimeShort('2026-01-15T10:30:00');
      expect(result).toBeTruthy();
      expect(result).not.toBe('-');
    });

    it('formats a Date object', () => {
      const result = formatDateTimeShort(new Date(2026, 0, 15, 10, 30));
      expect(result).toBeTruthy();
      expect(result).not.toBe('-');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // formatDateTimeFull
  // ═══════════════════════════════════════════════════════════════

  describe('formatDateTimeFull', () => {
    it('returns "-" for null input', () => {
      expect(formatDateTimeFull(null)).toBe('-');
    });

    it('returns "-" for undefined input', () => {
      expect(formatDateTimeFull(undefined)).toBe('-');
    });

    it('returns "-" for empty string input', () => {
      expect(formatDateTimeFull('')).toBe('-');
    });

    it('returns "-" for invalid date string', () => {
      expect(formatDateTimeFull('invalid')).toBe('-');
    });

    it('formats a valid date string', () => {
      const result = formatDateTimeFull('2026-01-15T10:30:00');
      expect(result).toBeTruthy();
      expect(result).not.toBe('-');
    });

    it('formats a Date object', () => {
      const result = formatDateTimeFull(new Date(2026, 0, 15, 10, 30));
      expect(result).toBeTruthy();
      expect(result).not.toBe('-');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // formatNumber
  // ═══════════════════════════════════════════════════════════════

  describe('formatNumber', () => {
    it('formats a number with default 2 decimal places', () => {
      const result = formatNumber(1234.5);
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('50');
    });

    it('formats a number with custom decimal places', () => {
      const result = formatNumber(1234.5678, 3);
      expect(result).toContain('568');
    });

    it('formats zero', () => {
      const result = formatNumber(0);
      expect(result).toContain('0');
    });

    it('formats negative numbers', () => {
      const result = formatNumber(-1234.56);
      expect(result).toContain('1');
      expect(result).toContain('234');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // formatCurrency
  // ═══════════════════════════════════════════════════════════════

  describe('formatCurrency', () => {
    it('formats with default INR currency', () => {
      const result = formatCurrency(1000);
      expect(result).toBeTruthy();
      // Should contain the number
      expect(result).toContain('1');
    });

    it('formats with custom currency', () => {
      const result = formatCurrency(1000, 'USD');
      expect(result).toBeTruthy();
    });

    it('formats zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
    });

    it('formats negative values', () => {
      const result = formatCurrency(-500);
      expect(result).toBeTruthy();
    });
  });
});
