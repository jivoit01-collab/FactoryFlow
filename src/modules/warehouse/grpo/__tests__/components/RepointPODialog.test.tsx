import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Mock dependencies
// ═══════════════════════════════════════════════════════════════

const openPOs = vi.hoisted(() => ({ current: [] as unknown[] }));
const repoint = vi.hoisted(() => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }));

vi.mock('@/modules/gate/api/po/po.queries', () => ({
  useOpenPOs: vi.fn(() => ({ data: openPOs.current, isLoading: false })),
}));

vi.mock('@/modules/gate/api/po/poReceipt.queries', () => ({
  useRepointPOReceipt: vi.fn(() => repoint),
}));

let lastSearchableSelectProps: any = null;
vi.mock('@/shared/components', () => ({
  SearchableSelect: (props: any) => {
    lastSearchableSelectProps = props;
    return <div data-testid="searchable-select" />;
  },
}));

vi.mock('@/shared/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

import { RepointPODialog } from '../../components/RepointPODialog';

const po = {
  vehicle_entry_id: 4923,
  po_receipt_id: 1347,
  po_number: '220826133',
  supplier_code: 'VENDA000936',
  supplier_name: 'Test Vendor',
  items: [{ po_item_code: 'PM0000914' }],
} as any;

function poOption(po_number: string, lines: Array<[string, string]>) {
  return {
    po_number,
    items: lines.map(([po_item_code, remaining_qty]) => ({ po_item_code, remaining_qty })),
  };
}

describe('RepointPODialog', () => {
  it('offers a PO that has every item on the receipt open', () => {
    openPOs.current = [poOption('220926064', [['PM0000914', '18656']])];

    render(<RepointPODialog po={po} open onOpenChange={vi.fn()} />);

    expect(lastSearchableSelectProps.items.map((p: any) => p.po_number)).toEqual(['220926064']);
  });

  it('does not offer the receipt its own PO back', () => {
    openPOs.current = [poOption('220826133', [['PM0000914', '500']])];

    render(<RepointPODialog po={po} open onOpenChange={vi.fn()} />);

    expect(lastSearchableSelectProps.items).toEqual([]);
  });

  it('does not offer a PO missing one of the receipt items', () => {
    openPOs.current = [poOption('220926050', [['PM0000411', '7912']])];

    render(<RepointPODialog po={po} open onOpenChange={vi.fn()} />);

    expect(lastSearchableSelectProps.items).toEqual([]);
  });

  it('does not offer a PO whose line for the item is fully drawn', () => {
    openPOs.current = [poOption('220926064', [['PM0000914', '0']])];

    render(<RepointPODialog po={po} open onOpenChange={vi.fn()} />);

    expect(lastSearchableSelectProps.items).toEqual([]);
  });

  it('shows how much each candidate has open, so the choice is informed', () => {
    openPOs.current = [poOption('220926064', [['PM0000914', '18656']])];

    render(<RepointPODialog po={po} open onOpenChange={vi.fn()} />);
    const { container } = render(
      <>{lastSearchableSelectProps.renderItem(openPOs.current[0] as any, false)}</>,
    );

    expect(container.textContent).toContain('PM0000914: 18656 open');
  });
});
