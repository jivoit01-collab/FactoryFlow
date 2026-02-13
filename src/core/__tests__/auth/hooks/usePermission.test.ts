import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// ═══════════════════════════════════════════════════════════════
// usePermission (src/core/auth/hooks/usePermission.ts)
// Direct Import + Mock
//
// Mock @/core/store before import.
// ═══════════════════════════════════════════════════════════════

const mockAuthState = {
  permissions: [
    'gatein.view_gateinentry',
    'gatein.add_gateinentry',
    'qualitycheck.view_inspection',
  ],
  user: {
    is_staff: false,
    companies: [
      { company_id: 1, role: 'admin', is_active: true },
      { company_id: 2, role: 'operator', is_active: false },
    ],
  },
  currentCompany: { company_id: 1, role: 'admin', is_active: true },
  permissionsLoaded: true,
};

vi.mock('@/core/store', () => ({
  useAppSelector: vi.fn((selector: any) => selector({ auth: mockAuthState })),
}));

import {
  usePermission,
  useHasPermission,
  useCanPerformAction,
} from '@/core/auth/hooks/usePermission';

describe('usePermission', () => {
  // ─── Return Shape ─────────────────────────────────────────

  it('returns all expected keys', () => {
    const { result } = renderHook(() => usePermission());
    const keys = Object.keys(result.current);
    expect(keys).toContain('permissions');
    expect(keys).toContain('permissionsLoaded');
    expect(keys).toContain('isStaff');
    expect(keys).toContain('currentCompany');
    expect(keys).toContain('companies');
    expect(keys).toContain('hasPermission');
    expect(keys).toContain('hasAnyPermission');
    expect(keys).toContain('hasAllPermissions');
    expect(keys).toContain('hasModulePermission');
    expect(keys).toContain('hasCompanyRole');
    expect(keys).toContain('hasAnyCompanyRole');
    expect(keys).toContain('hasRoleInAnyCompany');
    expect(keys).toContain('canPerformAction');
    expect(keys).toContain('canView');
    expect(keys).toContain('canAdd');
    expect(keys).toContain('canChange');
    expect(keys).toContain('canDelete');
    expect(keys).toContain('permissionSet');
  });

  // ─── State Values ─────────────────────────────────────────

  it('returns permissions array', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.permissions).toEqual(mockAuthState.permissions);
  });

  it('returns permissionsLoaded', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.permissionsLoaded).toBe(true);
  });

  it('returns isStaff from user', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.isStaff).toBe(false);
  });

  it('returns currentCompany', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.currentCompany?.company_id).toBe(1);
  });

  // ─── hasPermission ────────────────────────────────────────

  it('hasPermission returns true for existing permission', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasPermission('gatein.view_gateinentry')).toBe(true);
  });

  it('hasPermission returns false for missing permission', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasPermission('gatein.delete_gateinentry')).toBe(false);
  });

  // ─── hasAnyPermission ─────────────────────────────────────

  it('hasAnyPermission returns true when at least one matches', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasAnyPermission(['gatein.view_gateinentry', 'unknown.perm'])).toBe(true);
  });

  it('hasAnyPermission returns false when none match', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasAnyPermission(['unknown.a', 'unknown.b'])).toBe(false);
  });

  // ─── hasAllPermissions ────────────────────────────────────

  it('hasAllPermissions returns true when all match', () => {
    const { result } = renderHook(() => usePermission());
    expect(
      result.current.hasAllPermissions(['gatein.view_gateinentry', 'gatein.add_gateinentry']),
    ).toBe(true);
  });

  it('hasAllPermissions returns false when one is missing', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasAllPermissions(['gatein.view_gateinentry', 'unknown.perm'])).toBe(
      false,
    );
  });

  // ─── hasModulePermission ──────────────────────────────────

  it('hasModulePermission returns true for gatein', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasModulePermission('gatein')).toBe(true);
  });

  it('hasModulePermission returns false for unknown module', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasModulePermission('billing')).toBe(false);
  });

  // ─── canView / canAdd / canChange / canDelete ─────────────

  it('canView returns true for gatein.view_gateinentry', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.canView('gatein', 'gateinentry')).toBe(true);
  });

  it('canAdd returns true for gatein.add_gateinentry', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.canAdd('gatein', 'gateinentry')).toBe(true);
  });

  it('canChange returns false when missing change permission', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.canChange('gatein', 'gateinentry')).toBe(false);
  });

  it('canDelete returns false when missing delete permission', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.canDelete('gatein', 'gateinentry')).toBe(false);
  });

  // ─── hasCompanyRole ───────────────────────────────────────

  it('hasCompanyRole returns true for matching role', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasCompanyRole('admin')).toBe(true);
  });

  it('hasCompanyRole returns false for non-matching role', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasCompanyRole('operator')).toBe(false);
  });

  // ─── hasAnyCompanyRole ────────────────────────────────────

  it('hasAnyCompanyRole returns true when role matches', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasAnyCompanyRole(['admin', 'supervisor'])).toBe(true);
  });

  it('hasAnyCompanyRole returns false when no role matches', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasAnyCompanyRole(['operator', 'supervisor'])).toBe(false);
  });

  // ─── hasRoleInAnyCompany ──────────────────────────────────

  it('hasRoleInAnyCompany returns true for active company with role', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasRoleInAnyCompany('admin')).toBe(true);
  });

  it('hasRoleInAnyCompany returns false for inactive company with role', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.hasRoleInAnyCompany('operator')).toBe(false);
  });

  // ─── permissionSet ────────────────────────────────────────

  it('permissionSet is a Set of permissions', () => {
    const { result } = renderHook(() => usePermission());
    expect(result.current.permissionSet).toBeInstanceOf(Set);
    expect(result.current.permissionSet.has('gatein.view_gateinentry')).toBe(true);
  });
});

// ─── useHasPermission ─────────────────────────────────────

describe('useHasPermission', () => {
  it('returns true for existing permission', () => {
    const { result } = renderHook(() => useHasPermission('gatein.view_gateinentry'));
    expect(result.current).toBe(true);
  });

  it('returns false for missing permission', () => {
    const { result } = renderHook(() => useHasPermission('unknown.perm'));
    expect(result.current).toBe(false);
  });
});

// ─── useCanPerformAction ──────────────────────────────────

describe('useCanPerformAction', () => {
  it('returns true for existing action permission', () => {
    const { result } = renderHook(() => useCanPerformAction('gatein', 'view', 'gateinentry'));
    expect(result.current).toBe(true);
  });

  it('returns false for missing action permission', () => {
    const { result } = renderHook(() => useCanPerformAction('gatein', 'delete', 'gateinentry'));
    expect(result.current).toBe(false);
  });
});
