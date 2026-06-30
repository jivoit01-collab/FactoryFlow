import { fireEvent, render, screen } from '@testing-library/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BoxTransferPage from '../../pages/BoxTransferPage';

const mockNavigate = vi.fn();
const mockTransferBoxes = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock('@/modules/wms/store', () => ({
  useWmsPalletSync: () => vi.fn(),
}));

vi.mock('@/shared/components/dashboard/DashboardHeader', () => ({
  DashboardHeader: ({ title, description }: { title: string; description?: string }) => (
    <header>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  ),
}));

vi.mock('@/shared/components/SearchableSelect', () => ({
  SearchableSelect: ({
    label,
    items,
    onItemSelect,
  }: {
    label: string;
    items: Array<{ pallet_id: string }>;
    onItemSelect: (item: { pallet_id: string }) => void;
  }) => (
    <div>
      <span>{label}</span>
      <span data-testid={`${label}-count`}>{items.length}</span>
      {items[0] && (
        <button type="button" onClick={() => onItemSelect(items[0])}>
          {items[0].pallet_id}
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/shared/components/ui', () => ({
  Badge: ({ children, className }: { children: ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/ScanSearchButton', () => ({
  default: () => <button type="button">Scan</button>,
}));

vi.mock('../../utils/errors', () => ({
  toastBarcodeError: vi.fn(),
}));

vi.mock('../../api', () => ({
  usePallets: vi.fn((filters, options) => {
    if (options?.enabled === false) {
      return { data: undefined, isLoading: false };
    }
    if (filters?.status === 'ACTIVE') {
      return {
        data: [
          {
            id: 1,
            pallet_id: 'PAL-SOURCE',
            box_count: 1,
            current_warehouse: 'FG01',
            status: 'ACTIVE',
          },
        ],
        isLoading: false,
      };
    }
    if (!filters?.status) {
      return { data: { error: 'Unexpected list shape' }, isLoading: false };
    }
    return { data: [], isLoading: false };
  }),
  usePalletDetail: vi.fn((palletId: number | null) => {
    if (palletId === 1) {
      return {
        data: {
          id: 1,
          pallet_id: 'PAL-SOURCE',
          item_code: 'FG001',
          item_name: 'Finished Good',
          batch_number: 'BATCH-1',
          box_count: 1,
          max_box_count: 10,
          uom: 'PCS',
          current_warehouse: 'FG01',
          status: 'ACTIVE',
          boxes: [
            {
              id: 11,
              box_barcode: 'BOX-001',
              qty: '5.00',
              uom: 'PCS',
              status: 'ACTIVE',
            },
          ],
        },
      };
    }
    return { data: undefined };
  }),
  useTransferBoxes: () => ({
    isPending: false,
    mutateAsync: mockTransferBoxes,
  }),
}));

describe('BoxTransferPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps rendering after a user selects a box', () => {
    render(<BoxTransferPage />);

    fireEvent.click(screen.getByRole('button', { name: 'PAL-SOURCE' }));
    fireEvent.click(screen.getByRole('checkbox'));

    expect(screen.getByText('Transfer:')).toBeInTheDocument();
    expect(screen.getByText(/1 boxes, 5/)).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});
