import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WAREHOUSE_PERMISSIONS } from '@/config/permissions';

import { warehouseModuleConfig } from '../../module.config';
import WarehouseDashboardPage from '../WarehouseDashboardPage';

const granted = vi.hoisted(() => ({ all: false, codes: new Set<string>() }));

// The pages module.config lazy-loads are never rendered here; stub the loader so
// importing the real config doesn't drag every page in behind it.
vi.mock('@/core/pwa/chunkReload', () => ({ lazyWithRetry: () => () => null }));
vi.mock('@/core/auth', () => ({
  usePermission: () => ({
    permissionsLoaded: true,
    hasAnyPermission: (codes: readonly string[]) =>
      granted.all || codes.some((code) => granted.codes.has(code)),
  }),
  useAuth: () => ({ currentCompany: { company_code: 'JIVO_OIL' } }),
}));

const sidebarTitles = () =>
  (warehouseModuleConfig.navigation?.find((item) => item.path === '/warehouse')?.children ?? [])
    .filter((child) => !child.companies || child.companies.includes('JIVO_OIL'))
    .map((child) => child.title);

function renderPage() {
  render(
    <MemoryRouter>
      <WarehouseDashboardPage />
    </MemoryRouter>,
  );
}

describe('the Warehouse page shows what the Warehouse sidebar group shows', () => {
  beforeEach(() => {
    granted.all = false;
    granted.codes = new Set();
  });

  it('lists every sidebar entry, in sidebar order, for a user who holds them all', () => {
    granted.all = true;
    renderPage();

    const tiles = screen.getAllByRole('link').map((link) => link.textContent?.trim());
    expect(tiles).toEqual(sidebarTitles());
    expect(tiles).toContain('Request Stock');
    expect(tiles).toContain('Credit Note Approval');
  });

  it('shows only the entries the user has a permission for', () => {
    granted.codes = new Set([
      WAREHOUSE_PERMISSIONS.CREATE_TRANSFER_REQUEST,
      WAREHOUSE_PERMISSIONS.VIEW_AR_CREDIT_NOTE_APPROVAL,
    ]);
    renderPage();

    const tiles = screen.getAllByRole('link').map((link) => link.textContent?.trim());
    expect(tiles).toEqual(['Request Stock', 'Credit Note Approval']);
  });
});
