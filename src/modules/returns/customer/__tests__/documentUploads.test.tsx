import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GoodsReturnDetail } from '../api';

// ---- mocks: everything but the save-then-upload flow ------------------------

// The factories below are hoisted above every import, so the fakes they use are too.
const { createReturn, uploadAttachment } = vi.hoisted(() => ({
  createReturn: vi.fn(),
  uploadAttachment: vi.fn(),
}));
let detailFixture: GoodsReturnDetail;

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>();
  const idle = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return {
    ...actual,
    goodsReturnApi: { ...actual.goodsReturnApi, uploadAttachment },
    useCreateGoodsReturn: () => ({ mutateAsync: createReturn, isPending: false }),
    useInvoiceSearch: idle,
    useGoodsReturn: () => ({ data: detailFixture, isLoading: false }),
    useAddInvoiceRef: idle,
    useRemoveInvoiceRef: idle,
    useDeleteAttachment: idle,
    useUploadAttachment: idle,
    useUpdateGoodsReturnHeader: idle,
    useSetGoodsReturnVehicle: idle,
  };
});

// The error banner is what these tests read; the selects fetch their own options.
vi.mock('@/modules/gate/components', () => ({
  StepHeader: ({ error }: { error?: string | null }) =>
    error ? <p role="alert">{error}</p> : null,
  DriverSelect: () => null,
  VehicleSelect: () => null,
}));
vi.mock('../components/ReturnCustomerPicker', () => ({
  ReturnCustomerPicker: ({
    onChange,
  }: {
    onChange: (customer: { customer_code: string; customer_name: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange({ customer_code: 'CUSTA000002', customer_name: 'Jivo Wellness' })}
    >
      Pick customer
    </button>
  ),
}));

import GoodsReturnDetailsEditPage from '../pages/GoodsReturnDetailsEditPage';
import GoodsReturnStep1Page from '../pages/GoodsReturnStep1Page';

function DetailsProbe() {
  const { entryId } = useParams();
  const state = useLocation().state as { failedUploads?: string[] } | null;
  return (
    <p>
      details of {entryId}; failed: {state?.failedUploads?.join(', ') ?? 'none'}
    </p>
  );
}

function renderNewReturn() {
  const utils = render(
    <MemoryRouter initialEntries={['/returns/customer/new']}>
      <Routes>
        <Route path="/returns/customer/new" element={<GoodsReturnStep1Page />} />
        <Route path="/returns/customer/edit/:entryId/details" element={<DetailsProbe />} />
        <Route path="/returns/customer/edit/:entryId/items" element={<p>items step</p>} />
      </Routes>
    </MemoryRouter>,
  );
  // A debit-note return carried in by hand: no invoice search, no vehicle.
  fireEvent.click(screen.getByRole('checkbox', { name: /coming on a vehicle/i }));
  fireEvent.click(screen.getByText('Against Debit Note'));
  fireEvent.click(screen.getByRole('button', { name: 'Pick customer' }));
  const input = utils.container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [new File(['jpeg'], 'debit-note.jpg', { type: 'image/jpeg' })] },
  });
  return utils;
}

beforeEach(() => {
  createReturn.mockReset();
  uploadAttachment.mockReset();
  createReturn.mockResolvedValue({ id: 7, entry_no: 'GR-20261012-0001' });
});

describe('new customer return', () => {
  it('keeps Save locked until its documents are up', async () => {
    let finishUpload: () => void = () => {};
    uploadAttachment.mockReturnValue(new Promise<void>((resolve) => (finishUpload = resolve)));
    renderNewReturn();

    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' }));
    const uploading = await screen.findByRole('button', { name: /uploading document 1 of 1/i });
    expect(uploading).toBeDisabled();
    // A second tap while the photo goes up used to raise a second return.
    fireEvent.click(uploading);
    expect(createReturn).toHaveBeenCalledTimes(1);

    finishUpload();
    expect(await screen.findByText('items step')).toBeInTheDocument();
  });

  it('opens the saved return to add a document that did not upload', async () => {
    uploadAttachment.mockRejectedValue(new Error('timeout of 180000ms exceeded'));
    renderNewReturn();

    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' }));

    expect(await screen.findByText('details of 7; failed: debit-note.jpg')).toBeInTheDocument();
    // Saved once, and not offered a second save that would duplicate it.
    expect(createReturn).toHaveBeenCalledTimes(1);
  });
});

describe('return details', () => {
  it('names the documents that did not upload on the new-return page', async () => {
    detailFixture = {
      id: 7,
      entry_no: 'GR-20261012-0001',
      basis: 'DEBIT_NOTE',
      customer_code: 'CUSTA000002',
      customer_name: 'Jivo Wellness',
      customer_ref_no: '',
      comes_on_vehicle: false,
      vehicle: null,
      vehicle_no: '',
      driver: null,
      driver_name: '',
      expected_arrival_at: null,
      gated_in_at: null,
      invoice_refs: [],
      lines: [],
      attachments: [],
    } as unknown as GoodsReturnDetail;

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/returns/customer/edit/7/details',
            state: { failedUploads: ['debit-note.jpg'] },
          },
        ]}
      >
        <Routes>
          <Route
            path="/returns/customer/edit/:entryId/details"
            element={<GoodsReturnDetailsEditPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'GR-20261012-0001 was saved, but debit-note.jpg did not upload. Add it again below.',
      ),
    );
  });
});
