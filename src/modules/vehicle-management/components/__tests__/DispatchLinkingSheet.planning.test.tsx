import { render, screen } from '@testing-library/react';
import { addDays, format, subDays } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';

import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';

import { DispatchLinkingSheet } from '../DispatchLinkingSheet';

vi.mock('@/modules/gate/api/vehicle/vehicle.queries', () => ({
  useVehicleById: () => ({ data: undefined }),
  useVehicleNames: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/modules/gate/components', () => ({ CreateVehicleDialog: () => null }));
vi.mock('@/modules/dispatch/components/freight-approval/useTruckFreight', () => ({
  useTruckFreight: () => ({ quote: null }),
}));
vi.mock('@/modules/dispatch/components/freight-approval/TruckFreightFields', () => ({
  TruckFreightFields: () => null,
}));

const day = (offset: number) =>
  format(offset >= 0 ? addDays(new Date(), offset) : subDays(new Date(), -offset), 'yyyy-MM-dd');

const bill = (
  docEntry: number,
  plan: { dispatch_date?: string | null; booking_status?: string; vehicle_id?: number | null },
  isSelected: boolean,
) =>
  ({
    doc_entry: docEntry,
    doc_num: `6261${docEntry}`,
    card_code: 'CUSTA000844',
    card_name: 'MAHARANI TRADERS',
    city: 'DELHI',
    state: 'DL',
    total_litres: 3000,
    total_weight: 3242.5,
    total_boxes: 400,
    doc_total: 35456,
    is_selected: isSelected,
    plan: {
      dispatch_date: null,
      booking_status: 'PENDING',
      vehicle_id: null,
      bilty_no: '',
      bilty_date: null,
      ...plan,
    },
  }) as unknown as DispatchBill;

function open(bills: DispatchBill[]) {
  render(
    <DispatchLinkingSheet
      bill={bills[0]}
      selectedBills={bills}
      open
      isSaving={false}
      isUnlinking={false}
      onOpenChange={vi.fn()}
      onSave={vi.fn()}
      onUnlink={vi.fn()}
    />,
  );
}

describe('what linking does to planning, said before it happens', () => {
  it('counts the bills it will date today and the ones it will select', () => {
    open([
      bill(8101, { dispatch_date: null }, false),
      bill(8102, { dispatch_date: day(-2) }, true),
      bill(8103, { dispatch_date: day(1) }, true),
    ]);

    expect(
      screen.getByText(
        'Linking dates 2 bills today (no dispatch date yet, or one already past) so the gate ' +
          'expects this truck and adds 1 bill to Bill Selection.',
      ),
    ).toBeInTheDocument();
  });

  it('says nothing when every bill is dated and selected', () => {
    open([
      bill(8111, { dispatch_date: day(0) }, true),
      bill(8112, { dispatch_date: day(1) }, true),
    ]);

    expect(screen.queryByText(/^Linking /)).not.toBeInTheDocument();
  });

  it("leaves a past date alone on a re-save of the bill's own truck", () => {
    open([bill(8121, { dispatch_date: day(-1), booking_status: 'BOOKED', vehicle_id: 7 }, true)]);

    expect(screen.queryByText(/^Linking /)).not.toBeInTheDocument();
  });

  it("shows each bill's own date rather than the first bill's for the truck", () => {
    open([
      bill(8131, { dispatch_date: day(1) }, true),
      bill(8132, { dispatch_date: day(2) }, true),
    ]);

    expect(screen.getByText(day(1))).toBeInTheDocument();
    expect(screen.getByText(day(2))).toBeInTheDocument();
  });
});
