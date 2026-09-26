import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MaterialReadinessPanel, type ReadinessRow } from '../components/MaterialReadinessPanel';
import type { PlanCheckMaterialRow, PlanCheckMaterialSummary } from '../types';

/** A row as the plan check returns it for Oil: BH-PC only, nothing requested. */
function oilRow(overrides: Partial<PlanCheckMaterialRow>): PlanCheckMaterialRow {
  return {
    item_code: 'PM001',
    item_name: 'Caps',
    uom: 'PCS',
    material_type: 'PACKAGING',
    item_group: 'PACKAGING MATERIAL',
    issue_warehouse: 'BH-PC',
    searched_warehouses: ['BH-PC'],
    has_own_bom: false,
    qty_per_case: 20,
    qty_per_piece: 1,
    pieces_per_case: 20,
    bom_base_qty: 20,
    required_qty: 2000,
    bom_required_qty: 2000,
    required_is_overridden: false,
    on_hand: 500,
    committed: null,
    free: null,
    other_plan_demand: 0,
    available_after_other_plans: 500,
    balance_after_this_plan: -1500,
    shortfall: 1500,
    status: 'PARTIAL',
    stock_source: 'SAP',
    stock_scope: 'PRODUCTION_CONSUMPTION',
    register_missing: false,
    register_as_of: null,
    sap_on_hand: null,
    sap_free: null,
    approval_required: false,
    approval_qty: 0,
    approval_reason: 'No warehouse request — the run draws from BH-PC.',
    qty_at_production_consumption: 500,
    warehouses: [{ warehouse: 'BH-PC', on_hand: 500, committed: 0, as_of_date: null }],
    competing_runs: [],
    on_order_qty: null,
    on_order_earliest_due: null,
    days_since_last_consumption: null,
    ...overrides,
  } as PlanCheckMaterialRow;
}

const summary: PlanCheckMaterialSummary = {
  total_lines: 2,
  ok_lines: 0,
  tight_lines: 0,
  contested_lines: 0,
  partial_lines: 1,
  short_lines: 1,
  no_record_lines: 0,
  status: 'SHORT',
  approval_lines: 0,
  register_missing_lines: 0,
};

function renderPanel(checks: PlanCheckMaterialRow[]) {
  const rows: ReadinessRow[] = checks.map((check) => ({
    id: check.item_code,
    material_code: check.item_code,
    material_name: check.item_name,
    uom: check.uom,
    check,
  }));
  render(
    <MaterialReadinessPanel
      rows={rows}
      summary={summary}
      hasSku
      requiredQtyEntered
      renderRequiredInput={(index) => <span>{checks[index].required_qty}</span>}
    />,
  );
}

describe('MaterialReadinessPanel for a company that plans on BH-PC stock', () => {
  it('shows BH-PC only, with no Free or Approval column', () => {
    renderPanel([oilRow({})]);
    expect(screen.getByRole('columnheader', { name: 'At BH-PC' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Free' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Approval' })).not.toBeInTheDocument();
    expect(screen.getByText(/nothing is\s+requested from the warehouse/)).toBeInTheDocument();
  });

  it('calls a component partly at the line partial, and an empty one none at BH-PC', () => {
    renderPanel([
      oilRow({}),
      oilRow({
        item_code: 'PM002',
        item_name: 'Labels',
        on_hand: 0,
        shortfall: 2000,
        status: 'SHORT',
        warehouses: [],
      }),
    ]);
    expect(screen.getByText('Partly at the line')).toBeInTheDocument();
    expect(screen.getByText('partly at the line')).toBeInTheDocument();
    expect(screen.getByText('none at BH-PC')).toBeInTheDocument();
  });
});
