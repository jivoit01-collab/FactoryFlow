import { describe, it, expect } from 'vitest';
import {
  getInitials,
  formatDate,
  groupPermissionsByApp,
  formatPermissionName,
} from '../../utils/profile.utils';

describe('Profile Utilities', () => {
  // ═══════════════════════════════════════════════════════════════
  // getInitials
  // ═══════════════════════════════════════════════════════════════

  describe('getInitials', () => {
    it('returns first and last initials for a full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('returns first and last initials for multi-word name', () => {
      expect(getInitials('John Michael Doe')).toBe('JD');
    });

    it('returns first two characters for a single name', () => {
      expect(getInitials('John')).toBe('JO');
    });

    it('uppercases the initials', () => {
      expect(getInitials('john doe')).toBe('JD');
    });

    it('falls back to email when name is not provided', () => {
      expect(getInitials(undefined, 'user@example.com')).toBe('US');
    });

    it('returns "U" when neither name nor email is provided', () => {
      expect(getInitials()).toBe('U');
    });

    it('prefers name over email', () => {
      expect(getInitials('Alice Bob', 'alice@example.com')).toBe('AB');
    });

    it('handles name with extra whitespace', () => {
      expect(getInitials('  Jane   Smith  ')).toBe('JS');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // formatDate
  // ═══════════════════════════════════════════════════════════════

  describe('formatDate', () => {
    it('formats a valid ISO date string', () => {
      const result = formatDate('2024-01-15T10:30:00Z');
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('returns "Invalid Date" for an unparseable date string', () => {
      // new Date('not-a-date') produces Invalid Date (doesn't throw)
      // toLocaleDateString returns "Invalid Date"
      expect(formatDate('not-a-date')).toBe('Invalid Date');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // groupPermissionsByApp
  // ═══════════════════════════════════════════════════════════════

  describe('groupPermissionsByApp', () => {
    it('groups permissions by app label', () => {
      const permissions = ['accounts.add_user', 'accounts.view_user', 'gatein.view_logentry'];
      const result = groupPermissionsByApp(permissions);
      expect(result).toEqual({
        accounts: ['accounts.add_user', 'accounts.view_user'],
        gatein: ['gatein.view_logentry'],
      });
    });

    it('returns empty object for empty array', () => {
      expect(groupPermissionsByApp([])).toEqual({});
    });

    it('handles single permission', () => {
      const result = groupPermissionsByApp(['admin.change_settings']);
      expect(result).toEqual({ admin: ['admin.change_settings'] });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // formatPermissionName
  // ═══════════════════════════════════════════════════════════════

  describe('formatPermissionName', () => {
    it('formats "accounts.add_user" to "Add User"', () => {
      expect(formatPermissionName('accounts.add_user')).toBe('Add User');
    });

    it('formats "gatein.view_logentry" to "View Logentry"', () => {
      expect(formatPermissionName('gatein.view_logentry')).toBe('View Logentry');
    });

    it('formats single-word codename', () => {
      expect(formatPermissionName('admin.superuser')).toBe('Superuser');
    });

    it('handles multi-underscore codename', () => {
      expect(formatPermissionName('app.can_view_all_reports')).toBe('Can View All Reports');
    });
  });
});
