import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// ═══════════════════════════════════════════════════════════════
// Mutable mock state
// ═══════════════════════════════════════════════════════════════

let mockParams: Record<string, string> = {};
let mockSearchParams = new URLSearchParams();
let mockLocation = { pathname: '/gate/raw-materials/new' };

// ═══════════════════════════════════════════════════════════════
// Mock react-router-dom
// ═══════════════════════════════════════════════════════════════

vi.mock('react-router-dom', () => ({
  useParams: () => mockParams,
  useSearchParams: () => [mockSearchParams],
  useLocation: () => mockLocation,
}));

// ═══════════════════════════════════════════════════════════════
// Import the hook under test
// ═══════════════════════════════════════════════════════════════

import { useEntryId } from '../../hooks/useEntryId';

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('useEntryId', () => {
  beforeEach(() => {
    mockParams = {};
    mockSearchParams = new URLSearchParams();
    mockLocation = { pathname: '/gate/raw-materials/new' };
  });

  // ═══════════════════════════════════════════════════════════════
  // Create mode
  // ═══════════════════════════════════════════════════════════════

  describe('create mode (no /edit/ in pathname)', () => {
    it('reads entryId from search params', () => {
      mockSearchParams = new URLSearchParams('entryId=42');
      mockLocation = { pathname: '/gate/raw-materials/new' };

      const { result } = renderHook(() => useEntryId());

      expect(result.current.isEditMode).toBe(false);
      expect(result.current.entryId).toBe('42');
      expect(result.current.entryIdNumber).toBe(42);
    });

    it('returns null when no entryId search param is present', () => {
      mockSearchParams = new URLSearchParams();
      mockLocation = { pathname: '/gate/raw-materials/new' };

      const { result } = renderHook(() => useEntryId());

      expect(result.current.isEditMode).toBe(false);
      expect(result.current.entryId).toBeNull();
      expect(result.current.entryIdNumber).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edit mode
  // ═══════════════════════════════════════════════════════════════

  describe('edit mode (pathname contains /edit/)', () => {
    it('reads entryId from route params', () => {
      mockParams = { entryId: '99' };
      mockLocation = { pathname: '/gate/raw-materials/edit/99' };

      const { result } = renderHook(() => useEntryId());

      expect(result.current.isEditMode).toBe(true);
      expect(result.current.entryId).toBe('99');
      expect(result.current.entryIdNumber).toBe(99);
    });

    it('returns null when route param entryId is missing', () => {
      mockParams = {};
      mockLocation = { pathname: '/gate/raw-materials/edit/' };

      const { result } = renderHook(() => useEntryId());

      expect(result.current.isEditMode).toBe(true);
      expect(result.current.entryId).toBeNull();
      expect(result.current.entryIdNumber).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge cases
  // ═══════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('returns null for entryIdNumber when entryId is not a number (NaN)', () => {
      mockSearchParams = new URLSearchParams('entryId=abc');
      mockLocation = { pathname: '/gate/raw-materials/new' };

      const { result } = renderHook(() => useEntryId());

      expect(result.current.entryId).toBe('abc');
      expect(result.current.entryIdNumber).toBeNull();
    });

    it('parses a valid numeric string correctly', () => {
      mockSearchParams = new URLSearchParams('entryId=1234');
      mockLocation = { pathname: '/gate/construction/new' };

      const { result } = renderHook(() => useEntryId());

      expect(result.current.entryId).toBe('1234');
      expect(result.current.entryIdNumber).toBe(1234);
    });
  });
});
