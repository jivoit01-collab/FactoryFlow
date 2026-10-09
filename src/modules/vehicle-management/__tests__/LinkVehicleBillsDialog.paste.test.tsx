import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';

import {
  LinkVehicleBillsDialog,
  type PastedBillAnswers,
} from '../components/LinkVehicleBillsDialog';

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
// Older than the feed: found only by the lookup.
const OIL_OLD = bill(4, '626010001', 'JIVO_OIL', 1, 'Kundli');

function renderDialog(onLookupBills?: (numbers: string[]) => Promise<PastedBillAnswers>) {
  const onConfirm = vi.fn();
  render(
    <LinkVehicleBillsDialog
      open
      mode="add"
      vehicle={{ id: 9, number: 'DL01CLX0002' }}
      bills={[OIL_KUNDLI, OIL_OTHER, BEV]}
      isLoading={false}
      isError={false}
      onLookupBills={onLookupBills}
      onOpenChange={() => {}}
      onConfirm={onConfirm}
    />,
  );
  return onConfirm;
}

function paste(text: string, inputId = 'link-vehicle-bill-0') {
  return fireEvent.paste(screen.getByTestId(inputId), {
    clipboardData: { getData: (type: string) => (type === 'text/plain' ? text : '') },
  });
}

describe('pasting bill numbers into a bill field', () => {
  beforeEach(() => {
    selects.byId = {};
  });

  it('puts each pasted bill in a field of its own, in the order pasted', () => {
    const onConfirm = renderDialog();
    act(() => {
      paste('626088117\r\n626090104\r\n');
    });

    expect(screen.getByTestId('link-vehicle-bill-0')).toHaveTextContent('626088117');
    expect(screen.getByTestId('link-vehicle-bill-1')).toHaveTextContent('626090104');
    expect(screen.getByText('2 pasted bill(s) added.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ bills: [BEV, OIL_KUNDLI] }));
  });

  it('looks up only the numbers the list does not hold, and keeps what it finds', async () => {
    const onLookupBills = vi.fn(async () => {
      const answers: PastedBillAnswers = new Map();
      answers.set('626010001', OIL_OLD);
      answers.set('626010002', 'already on HR55AB1234');
      return answers;
    });
    const onConfirm = renderDialog(onLookupBills);
    act(() => {
      paste('626090104\n626010001\n626010002');
    });

    expect(await screen.findByText('2 of 3 pasted bill(s) added. Not added:')).toBeInTheDocument();
    expect(onLookupBills).toHaveBeenCalledWith(['626010001', '626010002']);
    expect(screen.getByText('626010002 — already on HR55AB1234')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ bills: [OIL_KUNDLI, OIL_OLD] }),
    );
  });

  it('holds Continue back while the lookup runs', () => {
    renderDialog(() => new Promise(() => {}));
    act(() => selects.byId['link-vehicle-bill-0'].onItemSelect(OIL_KUNDLI));
    act(() => {
      paste('626010001');
    });

    expect(screen.getByText('Looking up 1 pasted bill(s)...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('leaves out a bill already picked and one of another SAP branch, saying why', () => {
    const onConfirm = renderDialog();
    act(() => selects.byId['link-vehicle-bill-0'].onItemSelect(OIL_KUNDLI));
    act(() => {
      paste('626090104\n723456910\n626088117');
    });

    expect(screen.getByText('1 of 3 pasted bill(s) added. Not added:')).toBeInTheDocument();
    expect(screen.getByText('626090104 — already on the list')).toBeInTheDocument();
    expect(screen.getByText(/723456910 is Delhi Depot, but 626090104 is Kundli/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ bills: [OIL_KUNDLI, BEV] }));
  });

  it('says a number it cannot find is not an unlinked bill', () => {
    renderDialog();
    act(() => {
      paste('626090104\n999999999');
    });

    expect(screen.getByText('999999999 — is not an unlinked bill')).toBeInTheDocument();
  });

  it('leaves a paste with no bill number in it to the search box', () => {
    renderDialog();
    expect(paste('JIVO MART')).toBe(true);
    expect(paste('00246')).toBe(true);
    expect(screen.queryByText(/pasted bill/)).not.toBeInTheDocument();
  });
});
