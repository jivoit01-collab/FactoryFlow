import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';

import { LinkVehicleBillsDialog } from '../components/LinkVehicleBillsDialog';
import { branchClash, firstBranchClash } from '../utils/branchCheck';

/* eslint-disable @typescript-eslint/no-explicit-any */
const selects = vi.hoisted(() => ({ byId: {} as Record<string, any> }));

vi.mock('@/shared/components', () => ({
  SearchableSelect: (props: any) => {
    selects.byId[props.inputId] = props;
    return <div data-testid={props.inputId}>{props.defaultDisplayText}</div>;
  },
}));
vi.mock('@/modules/gate/api/vehicle/vehicle.queries', () => ({
  useVehicleNames: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/modules/gate/components', () => ({ CreateVehicleDialog: () => null }));
vi.mock('@/shared/components/ui', async (importOriginal) => {
  const actual: any = await importOriginal();
  const Plain = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    ...actual,
    Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
      open ? <div>{children}</div> : null,
    DialogContent: Plain,
    DialogHeader: Plain,
    DialogTitle: Plain,
    DialogDescription: Plain,
    DialogFooter: Plain,
  };
});

const bill = (docEntry: number, docNum: string, company: string, branch: number, name: string) =>
  ({
    doc_entry: docEntry,
    doc_num: docNum,
    company_code: company,
    branch_id: branch,
    branch_name: name,
    card_name: 'JIVO MART PVT LTD',
    city: 'SONIPAT',
    state: 'HR',
    total_litres: 10,
    total_weight: 10,
    doc_total: 100,
  }) as unknown as DispatchBill;

const OIL_KUNDLI = bill(1, '626090104', 'JIVO_OIL', 1, 'Kundli');
const OIL_OTHER = bill(2, '723456910', 'JIVO_OIL', 3, 'Delhi Depot');
const BEV = bill(3, '626088117', 'JIVO_BEVERAGES', 7, 'Bev Plant');

function renderDialog() {
  const onConfirm = vi.fn();
  render(
    <LinkVehicleBillsDialog
      open
      mode="add"
      vehicle={{ id: 9, number: 'DL01CLX0002' }}
      bills={[OIL_KUNDLI, OIL_OTHER, BEV]}
      isLoading={false}
      isError={false}
      onOpenChange={() => {}}
      onConfirm={onConfirm}
    />,
  );
  return onConfirm;
}

describe('branch check while picking bills', () => {
  beforeEach(() => {
    selects.byId = {};
  });

  it('refuses a second branch of the same company the moment it is picked', () => {
    renderDialog();
    act(() => selects.byId['link-vehicle-bill-0'].onItemSelect(OIL_KUNDLI));
    fireEvent.click(screen.getByRole('button', { name: /add another bill/i }));
    act(() => selects.byId['link-vehicle-bill-1'].onItemSelect(OIL_OTHER));

    expect(
      screen.getByText(/723456910 is Delhi Depot, but 626090104 is Kundli/),
    ).toBeInTheDocument();
    // The refused bill is not on the load.
    expect(screen.getByText(/1 bill\(s\)/)).toBeInTheDocument();
  });

  it('lets another company go on the same truck, whatever its branch', () => {
    const onConfirm = renderDialog();
    act(() => selects.byId['link-vehicle-bill-0'].onItemSelect(OIL_KUNDLI));
    fireEvent.click(screen.getByRole('button', { name: /add another bill/i }));
    act(() => selects.byId['link-vehicle-bill-1'].onItemSelect(BEV));

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ bills: [OIL_KUNDLI, BEV] }));
  });

  it('marks a clashing bill in the list before it is picked', () => {
    renderDialog();
    act(() => selects.byId['link-vehicle-bill-0'].onItemSelect(OIL_KUNDLI));
    fireEvent.click(screen.getByRole('button', { name: /add another bill/i }));

    render(<>{selects.byId['link-vehicle-bill-1'].renderItem(OIL_OTHER, false)}</>);
    expect(
      screen.getByText('Another SAP branch than the bills already picked'),
    ).toBeInTheDocument();
  });
});

describe('branchClash', () => {
  it('ignores a bill SAP gives no branch, as the server does', () => {
    const noBranch = { ...OIL_OTHER, branch_id: null } as unknown as DispatchBill;
    expect(branchClash(noBranch, [OIL_KUNDLI])).toBe('');
    expect(firstBranchClash([OIL_KUNDLI, OIL_OTHER])).toMatch(/one SAP branch/);
    expect(firstBranchClash([OIL_KUNDLI, BEV])).toBe('');
  });
});
