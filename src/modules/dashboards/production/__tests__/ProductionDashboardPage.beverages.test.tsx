import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ProductionDashboardPage from '../pages/ProductionDashboardPage';

const who = vi.hoisted(() => ({ code: 'JIVO_BEVERAGES', allowed: true }));
const shown = vi.hoisted(() => [] as string[]);

vi.mock('@/core/auth', () => ({
  useAuth: () => ({ currentCompany: { company_code: who.code, company_name: 'Jivo Beverages' } }),
  usePermission: () => ({ hasAnyPermission: () => who.allowed }),
}));

vi.mock('../../filling-cost/components/FillingCostSheetPanel', () => ({
  FillingCostSheetPanel: ({ date }: { date: string }) => {
    shown.push(date);
    return <div>filling cost sheet for {date}</div>;
  },
}));

vi.mock('../../filling-cost/components/FillingCostSkuPanel', () => ({
  FillingCostSkuPanel: ({ date }: { date: string }) => <div>cost by SKU for {date}</div>,
}));

// The wall's own reads: Beverages must never start them.
const wallRead = vi.hoisted(() => vi.fn());
vi.mock('../hooks', () => ({
  useProductionBoard: () => {
    wallRead();
    throw new Error('the wall was read for Beverages');
  },
  useProductionDay: () => {
    wallRead();
    throw new Error('the wall was read for Beverages');
  },
}));

describe('Production board for Jivo Beverages', () => {
  it('is the filling cost sheet and nothing else, opening on yesterday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T10:00:00'));
    try {
      render(<ProductionDashboardPage />);
    } finally {
      vi.useRealTimers();
    }

    expect(screen.getByText('filling cost sheet for 2026-09-28')).toBeInTheDocument();
    expect(wallRead).not.toHaveBeenCalled();
  });

  it('says why when the account may not see the sheet', () => {
    who.allowed = false;
    try {
      render(<ProductionDashboardPage />);
      expect(screen.getByText(/which your account\s+cannot view/)).toBeInTheDocument();
      expect(screen.queryByText(/filling cost sheet for/)).not.toBeInTheDocument();
    } finally {
      who.allowed = true;
    }
  });
});
