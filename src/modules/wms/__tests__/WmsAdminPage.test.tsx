import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WmsAdminPage from '../pages/WmsAdminPage';

const { removeMany, data } = vi.hoisted(() => ({
  removeMany: vi.fn().mockResolvedValue(undefined),
  data: {
    warehouses: [{ id: 'w1' }],
    zones: [],
    locations: [{ id: 'L1', code: 'A-01' }],
    materials: [{ id: 'm1', itemCode: 'SKU1', itemName: 'Item One', materialType: 'FG', defaultUom: 'EA', temperatureClass: null }],
    pallets: [
      { id: 'p1', licensePlate: 'PLT-1', itemCode: 'SKU1', itemName: 'Item One', boxCount: 4, status: 'ACTIVE', currentLocationId: 'L1' },
      { id: 'p2', licensePlate: 'PLT-2', itemCode: 'SKU2', itemName: 'Item Two', boxCount: 2, status: 'ACTIVE', currentLocationId: null },
    ],
    inventory: [
      { id: 'i1', itemCode: 'SKU1', itemName: 'Item One', quantity: 40, uom: 'EA', locationId: 'L1', lotNumber: '', palletId: 'p1' },
    ],
    movements: [],
    templates: [],
  } as Record<string, unknown[]>,
}));

vi.mock('@/modules/wms/store', () => ({
  useWmsEnabled: () => true,
  useWmsRole: () => ({ isAdmin: true }),
  useWmsCollection: (name: string) => ({ data: data[name] ?? [] }),
  wmsStore: { removeMany },
}));

vi.mock('../utils', () => ({ notifyOk: vi.fn(), notifyFail: vi.fn() }));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock('../components/AdminOnlyNotice', () => ({ AdminOnlyNotice: () => <div>admin only</div> }));
vi.mock('../components/WmsDisabledNotice', () => ({ WmsDisabledNotice: () => <div>disabled</div> }));

// Lightweight UI stand-ins (Radix needs polyfills jsdom lacks); we only care about behaviour.
let tabsOnValueChange: ((value: string) => void) | undefined;
vi.mock('@/shared/components/ui', () => ({
  Tabs: ({ onValueChange, children }: { onValueChange?: (v: string) => void; children: ReactNode }) => {
    tabsOnValueChange = onValueChange;
    return <div>{children}</div>;
  },
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ value, children }: { value: string; children: ReactNode }) => (
    <button type="button" onClick={() => tabsOnValueChange?.(value)}>{children}</button>
  ),
  Checkbox: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (c: boolean) => void }) => (
    <input type="checkbox" checked={!!checked} onChange={() => onCheckedChange?.(!checked)} />
  ),
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Button: ({ children, asChild, variant, size, ...props }: Record<string, unknown> & { children: ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <button type="button" {...props}>{children}</button>,
  Input: (props: Record<string, unknown>) => <input {...props} />,
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

beforeEach(() => {
  removeMany.mockClear();
});

describe('WmsAdminPage', () => {
  it('lists pallet records by default', () => {
    render(<WmsAdminPage />);
    expect(screen.getByText('PLT-1')).toBeInTheDocument();
    expect(screen.getByText('PLT-2')).toBeInTheDocument();
  });

  it('filters records by search', () => {
    render(<WmsAdminPage />);
    fireEvent.change(screen.getByPlaceholderText('Search pallets…'), { target: { value: 'PLT-2' } });
    expect(screen.queryByText('PLT-1')).not.toBeInTheDocument();
    expect(screen.getByText('PLT-2')).toBeInTheDocument();
  });

  it('deletes a single record through the confirm dialog', async () => {
    render(<WmsAdminPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete PLT-1' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(removeMany).toHaveBeenCalledWith('pallets', ['p1']);
  });

  it('clears all records in the active collection', () => {
    render(<WmsAdminPage />);
    fireEvent.click(screen.getByRole('button', { name: /Clear all/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(removeMany).toHaveBeenCalledWith('pallets', ['p1', 'p2']);
  });

  it('switches to another collection tab', () => {
    render(<WmsAdminPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Materials' }));
    expect(screen.getByPlaceholderText('Search materials…')).toBeInTheDocument();
    expect(screen.getByText(/no type|FG/)).toBeInTheDocument();
  });
});
