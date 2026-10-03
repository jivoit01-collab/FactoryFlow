import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';

import MaintenanceSparesPage from '../pages/MaintenanceSparesPage';

const fixtures = vi.hoisted(() => {
  const item = (id: number, particulars: string, specification: string, qty: string) => ({
    id,
    indent: 7,
    line_num: id,
    particulars,
    specification,
    quantity: qty,
    unit: 'NOS',
    priority: 'NORMAL',
    issued_quantity: '0.000',
    shortfall_quantity: qty,
    received_quantity: '0.000',
    received_spare: null,
    received_spare_name: '',
    remarks: '',
    is_active: true,
    created_by: null,
    updated_by: null,
    created_at: '2026-09-28T05:00:00Z',
    updated_at: '2026-09-28T05:00:00Z',
  });
  const indent = (id: number, status: string, items: ReturnType<typeof item>[]) => ({
    id,
    indent_no: `MI-20260928-000${id}`,
    status,
    requested_by_name: 'Gautam',
    items,
  });
  const spare = (id: number, name: string, stock: string, place = '') => ({
    id,
    company: 1,
    category: 1,
    category_name: 'General',
    name,
    part_number: name.toUpperCase(),
    sap_item_code: '',
    uom: 'NOS',
    compatible_assets: [],
    compatible_asset_codes: [],
    compatible_asset_names: [],
    is_critical: false,
    minimum_stock: '0.000',
    reorder_level: '2.000',
    current_stock: stock,
    unit_cost: '0.00',
    storage_location: place,
    description: '',
    is_low_stock: false,
    is_below_minimum: false,
    reorder_shortage_qty: '0.000',
    is_active: true,
    created_at: '2026-09-28T05:00:00Z',
    updated_at: '2026-09-28T05:00:00Z',
  });

  const state = {
    atGate: [
      indent(7, 'GATE_IN', [
        item(1, 'Zig zag tile', 'Yellow', '100.000'),
        item(2, 'Seals', '', '10.000'),
      ]),
    ],
    onTheWay: [indent(8, 'PURCHASED', [item(3, 'Starter', '', '1.000')])],
    spares: [spare(21, 'Bearing 6205', '5.000', 'Rack A'), spare(22, 'Tissue roll', '0.000')],
    photos: {
      21: [
        {
          id: 5,
          spare: 21,
          photo: 'http://localhost:8000/media/maintenance/spares/photos/bearing.jpg',
          created_by: 1,
          created_at: '2026-10-03T05:00:00Z',
        },
      ],
    } as Record<number, unknown[]>,
  };
  const receive = vi.fn().mockResolvedValue({});
  const giveOut = vi.fn().mockResolvedValue({});
  const createSpare = vi.fn().mockResolvedValue({});
  const updateSpare = vi.fn().mockResolvedValue({ id: 21 });
  const addPhotos = vi.fn().mockResolvedValue(0);
  const deletePhoto = vi.fn().mockResolvedValue(undefined);
  const mutation = (fn: ReturnType<typeof vi.fn>) => () => ({ mutateAsync: fn, isPending: false });
  const noop = () => ({ mutateAsync: vi.fn(), isPending: false });
  return {
    state,
    receive,
    giveOut,
    createSpare,
    updateSpare,
    addPhotos,
    deletePhoto,
    mutation,
    noop,
  };
});

vi.mock('../api', () => ({
  useMaintenanceSpares: () => ({ data: fixtures.state.spares, isLoading: false }),
  useMaterialIndents: (filters: { status: string }, enabled: boolean) => ({
    data: !enabled
      ? undefined
      : filters.status === 'GATE_IN'
        ? fixtures.state.atGate
        : fixtures.state.onTheWay,
    isLoading: false,
  }),
  useSpareRequests: () => ({ data: [], isLoading: false }),
  useSpareMovements: () => ({ data: [], isLoading: false }),
  useSparePhotos: (spareId: number | null) => ({
    data: spareId === null ? undefined : (fixtures.state.photos[spareId] ?? []),
    isLoading: false,
  }),
  useAddSparePhotos: fixtures.mutation(fixtures.addPhotos),
  useDeleteSparePhoto: fixtures.mutation(fixtures.deletePhoto),
  useReceiveMaterialIndent: fixtures.mutation(fixtures.receive),
  useGiveOutSpare: fixtures.mutation(fixtures.giveOut),
  useCreateMaintenanceSpare: fixtures.mutation(fixtures.createSpare),
  useIssueSpareRequest: fixtures.noop,
  useAdjustSpareStock: fixtures.noop,
  useUpdateMaintenanceSpare: fixtures.mutation(fixtures.updateSpare),
}));

const granted = vi.hoisted(() => ({ current: new Set<string>() }));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: (permission: string) => granted.current.has(permission),
  }),
}));

/** "Maint — Store Receiver" in ensure_role_groups.py: receive + manage spares. */
const STORE_KEEPER = [
  MAINTENANCE_PERMISSIONS.VIEW_SPARE,
  MAINTENANCE_PERMISSIONS.MANAGE_SPARE,
  MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT,
  MAINTENANCE_PERMISSIONS.RECEIVE_MATERIAL_INDENT,
];

function renderPage() {
  render(
    <MemoryRouter>
      <MaintenanceSparesPage />
    </MemoryRouter>,
  );
}

describe('Store page', () => {
  beforeEach(() => {
    granted.current = new Set<string>(STORE_KEEPER);
    fixtures.receive.mockClear();
    fixtures.giveOut.mockClear();
    fixtures.createSpare.mockClear();
    fixtures.updateSpare.mockClear();
    fixtures.addPhotos.mockClear();
    fixtures.deletePhoto.mockClear();
    // jsdom has no object urls; the form previews picked photos with them.
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('puts goods at the gate under To do and receives the counted numbers', async () => {
    renderPage();
    expect(screen.getByText(/Goods at gate · for Gautam/)).toBeInTheDocument();
    expect(screen.getByText('1 bought, not at gate yet')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Receive' }));
    const dialog = await screen.findByRole('dialog');
    // Each box starts at what was bought; only 90 of the tiles came.
    const tiles = within(dialog).getByLabelText(/Zig zag tile/);
    expect(tiles).toHaveValue(100);
    fireEvent.change(tiles, { target: { value: '90' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Put in store' }));

    await vi.waitFor(() => expect(fixtures.receive).toHaveBeenCalled());
    expect(fixtures.receive).toHaveBeenCalledWith({
      indentId: 7,
      payload: {
        items: [
          { id: 1, received_quantity: '90' },
          { id: 2, received_quantity: '10' },
        ],
      },
    });
  });

  it('will not receive when every count is zero', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Receive' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Zig zag tile/), { target: { value: '0' } });
    fireEvent.change(within(dialog).getByLabelText(/Seals/), { target: { value: '0' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Put in store' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nothing counted');
    expect(fixtures.receive).not.toHaveBeenCalled();
  });

  it('gives out more than the store shows, saying where the count will land', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Give out Bearing 6205' }));
    const dialog = await screen.findByRole('dialog');
    const give = within(dialog).getByRole('button', { name: 'Give' });

    // 5 on record; the store's real stock is not entered yet, so 6 may go.
    fireEvent.change(within(dialog).getByLabelText('How many?'), { target: { value: '6' } });
    expect(within(dialog).getByText(/The store will show -1 NOS after this/)).toBeInTheDocument();

    fireEvent.click(give);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Write who took it.');

    fireEvent.change(within(dialog).getByLabelText('Who took it?'), {
      target: { value: 'Ramesh' },
    });
    fireEvent.click(give);
    await vi.waitFor(() =>
      expect(fixtures.giveOut).toHaveBeenCalledWith({
        spareId: 21,
        payload: { quantity: '6', given_to: 'Ramesh' },
      }),
    );
  });

  it('still gives out an item the store shows as finished', () => {
    renderPage();
    expect(screen.getByText('Finished')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Give out Tissue roll' })).toBeEnabled();
  });

  it('offers to add an item that search did not find', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Search stock'), { target: { value: 'Starter' } });
    expect(screen.getByText('No item found.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add “Starter”/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Starter');
    fireEvent.change(within(dialog).getByLabelText('How many now?'), { target: { value: '3' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await vi.waitFor(() =>
      expect(fixtures.createSpare).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Starter',
          uom: 'NOS',
          current_stock: '3',
          part_number: '',
        }),
      ),
    );
  });

  it("sends a new item's photos once the item is saved", async () => {
    fixtures.createSpare.mockResolvedValueOnce({ id: 30 });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add item/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Oil bottle' } });

    const front = new File(['front'], 'front.jpg', { type: 'image/jpeg' });
    const back = new File(['back'], 'back.jpg', { type: 'image/jpeg' });
    const input = within(dialog).getByTestId('item-photo-input');
    fireEvent.change(input, { target: { files: [front, back] } });
    expect(within(dialog).getByAltText('front.jpg')).toBeInTheDocument();
    // A wrong pick comes off before anything is sent.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove back.jpg' }));
    expect(within(dialog).queryByAltText('back.jpg')).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await vi.waitFor(() =>
      expect(fixtures.addPhotos).toHaveBeenCalledWith({ spareId: 30, files: [front] }),
    );
    expect(fixtures.createSpare).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Oil bottle' }),
    );
    expect(fixtures.createSpare.mock.invocationCallOrder[0]).toBeLessThan(
      fixtures.addPhotos.mock.invocationCallOrder[0],
    );
  });

  it('adds an item with no photo without sending any', async () => {
    fixtures.createSpare.mockResolvedValueOnce({ id: 31 });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add item/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Add photo' })).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Fuse' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await vi.waitFor(() => expect(fixtures.createSpare).toHaveBeenCalled());
    expect(fixtures.addPhotos).not.toHaveBeenCalled();
  });

  it("shows an item's photos, and Edit takes a wrong one away on Save", async () => {
    renderPage();
    fireEvent.click(screen.getByText('Bearing 6205'));
    const item = await screen.findByRole('dialog');
    const shown = within(item).getByAltText('Bearing 6205 photo 1');
    expect(shown).toHaveAttribute(
      'src',
      'http://localhost:8000/media/maintenance/spares/photos/bearing.jpg',
    );
    // Tapping it opens the full picture.
    expect(shown.closest('a')).toHaveAttribute('target', '_blank');

    fireEvent.click(within(item).getByRole('button', { name: 'Edit' }));
    await screen.findByRole('heading', { name: 'Edit item' });
    const form = screen.getByRole('dialog');
    fireEvent.click(within(form).getByRole('button', { name: 'Remove photo 1' }));
    expect(within(form).queryByAltText('photo 1')).not.toBeInTheDocument();
    expect(fixtures.deletePhoto).not.toHaveBeenCalled();

    fireEvent.click(within(form).getByRole('button', { name: 'Save' }));
    await vi.waitFor(() =>
      expect(fixtures.deletePhoto).toHaveBeenCalledWith({ spareId: 21, photoId: 5 }),
    );
    expect(fixtures.updateSpare).toHaveBeenCalled();
    expect(fixtures.addPhotos).not.toHaveBeenCalled();
  });

  it('says so when there is nothing to do', () => {
    const { atGate } = fixtures.state;
    fixtures.state.atGate = [];
    try {
      renderPage();
      expect(screen.getByText('Nothing to do now.')).toBeInTheDocument();
    } finally {
      fixtures.state.atGate = atGate;
    }
  });

  it('shows a view-only user the stock and nothing to act on', () => {
    granted.current = new Set<string>([MAINTENANCE_PERMISSIONS.VIEW_SPARE]);
    renderPage();
    expect(screen.getByText('Bearing 6205')).toBeInTheDocument();
    expect(screen.queryByText('To do')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add item/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Give out/ })).not.toBeInTheDocument();
  });
});
