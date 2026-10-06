import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReturnableGatePass } from '../types';

// ---- mocks: everything but the photo rule itself ---------------------------

const post = vi.fn().mockResolvedValue({ data: {} });
vi.mock('@/core/api', () => ({
  apiClient: { post: (...args: unknown[]) => post(...args), get: vi.fn() },
}));

const createPass = vi.fn();
const updatePass = vi.fn();
vi.mock('../api/returnableGatePass.queries', () => ({
  useCreateReturnableGatePass: () => ({ mutateAsync: createPass, isPending: false }),
  useUpdateReturnableGatePass: () => ({ mutateAsync: updatePass, isPending: false }),
  useReturnableTimeline: () => ({ data: [], isLoading: false }),
}));

const recordReturn = vi.fn();
let gatePassFixture: ReturnableGatePass;
vi.mock('@/modules/gate/api/returnable', () => ({
  useReturnableGatePass: () => ({ data: gatePassFixture, isLoading: false }),
  useRecordReturnableReturn: () => ({ mutateAsync: recordReturn, isPending: false }),
}));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}));

// Typeaheads that fetch their own options are not what these tests are about.
vi.mock('@/modules/gate/components', () => ({ DepartmentSelect: () => null }));
vi.mock('../components/returnable/AssetSelect', () => ({ AssetSelect: () => null }));
vi.mock('../components/returnable/WorkOrderSelect', () => ({ WorkOrderSelect: () => null }));
vi.mock('../components/returnable/SapItemSelect', () => ({ SapItemSelect: () => null }));
vi.mock('../components/returnable/ReturnableTimeline', () => ({ ReturnableTimeline: () => null }));
vi.mock('@/modules/gate/components/returnable/ReturnableVehicleFields', () => ({
  ReturnableVehicleFields: () => null,
}));

import ReturnInFormPage from '@/modules/gate/pages/returnablePages/ReturnInFormPage';

import { returnableGatePassApi } from '../api/returnableGatePass.api';
import { ReturnableForm } from '../components/returnable/ReturnableForm';
import { isPhotoFile } from '../constants/returnable.constants';

const photo = (name = 'motor.jpg') => new File(['jpeg'], name, { type: 'image/jpeg' });

function outPass(overrides: Partial<ReturnableGatePass> = {}): ReturnableGatePass {
  return {
    id: 5,
    pass_no: 'RGP/2026-27/000071',
    status: 'OUT',
    is_returnable: true,
    is_overdue: false,
    days_overdue: 0,
    purpose: 'REPAIR',
    purpose_display: 'Repair',
    party_name: 'Sharma Motors',
    destination: 'Sharma Motors',
    expected_return_date: '2026-10-05',
    gate_out_at: '2026-09-27T10:00:00Z',
    total_quantity_out: '1.000',
    total_quantity_returned: '0.000',
    department: null,
    asset: null,
    work_order: null,
    items: [
      {
        id: 11,
        line_num: 1,
        item_code: '',
        item_name: 'Gear Motor 3HP',
        description: '',
        serial_no: 'GM-778',
        make_model: '',
        uom: 'NOS',
        quantity_out: '1.000',
        quantity_returned: '0.000',
        pending_return_qty: '1.000',
        condition_out: 'FAULTY',
        estimated_value: null,
        remarks: '',
      },
    ],
    attachments: [
      {
        id: 1,
        company: 1,
        gate_pass: 5,
        file: 'http://api.test/media/returnable-items/attachments/motor.jpg',
        doc_type: 'CHALLAN',
        doc_type_display: 'Delivery Challan',
        caption: '',
        created_at: '2026-09-27T09:00:00Z',
        created_by_name: 'Dept',
      },
    ],
    return_events: [],
    ...overrides,
  } as unknown as ReturnableGatePass;
}

beforeAll(() => {
  // jsdom has no object urls; the picker previews through them.
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  post.mockClear();
  createPass.mockReset();
  updatePass.mockReset();
  recordReturn.mockReset();
});

describe('isPhotoFile', () => {
  it('judges by the file, in step with the backend', () => {
    expect(isPhotoFile('IMG_2041.JPG')).toBe(true);
    expect(isPhotoFile('scan.heic')).toBe(true);
    expect(isPhotoFile('http://api.test/media/x/motor.png?v=2')).toBe(true);
    expect(isPhotoFile('challan.pdf')).toBe(false);
  });
});

describe('recordReturn', () => {
  it('sends the return and its photos in one multipart request', async () => {
    const front = photo('front.jpg');
    const plate = photo('nameplate.jpg');

    await returnableGatePassApi.recordReturn(
      5,
      { lines: [{ pass_item: 11, quantity_returned: '1', return_condition: 'OK', remarks: '' }] },
      [front, plate],
    );

    const [url, body] = post.mock.calls[0] as [string, FormData];
    expect(url).toContain('/returnable-gatepasses/5/');
    expect(JSON.parse(body.get('data') as string).lines[0].pass_item).toBe(11);
    expect(body.getAll('attachments')).toEqual([front, plate]);
  });
});

describe('gate pass form', () => {
  function fillRequiredFields() {
    fireEvent.change(screen.getByLabelText('Expected Return Date'), {
      target: { value: '2026-10-05' },
    });
    fireEvent.change(screen.getByLabelText('Party / Vendor Name'), {
      target: { value: 'Sharma Motors' },
    });
    fireEvent.change(screen.getByLabelText('Item Name'), { target: { value: 'Gear Motor 3HP' } });
  }

  it('will not create a pass without a photo of the material', async () => {
    createPass.mockResolvedValue(outPass({ status: 'DRAFT', attachments: [] }));
    const uploadAttachments = vi
      .spyOn(returnableGatePassApi, 'uploadAttachments')
      .mockResolvedValue([]);
    const { container } = render(<ReturnableForm onSaved={vi.fn()} onCancel={vi.fn()} />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Create Gate Pass' }));
    expect(await screen.findByText(/attach at least one photo/i)).toBeInTheDocument();
    expect(createPass).not.toHaveBeenCalled();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [photo()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Gate Pass' }));

    await waitFor(() => expect(createPass).toHaveBeenCalledTimes(1));
    // A picture goes up as a photo, not under the old "Delivery Challan" default.
    expect(uploadAttachments).toHaveBeenCalledWith(5, [
      expect.objectContaining({ doc_type: 'PHOTO' }),
    ]);
  });

  it('counts a photo already on the pass when it is edited', async () => {
    updatePass.mockResolvedValue(outPass({ status: 'DRAFT' }));
    render(
      <ReturnableForm
        gatePass={outPass({ status: 'DRAFT' })}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/already on RGP\/2026-27\/000071: 1 photo\./i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(updatePass).toHaveBeenCalledTimes(1));
  });
});

describe('gate in', () => {
  function renderGateIn() {
    return render(
      <MemoryRouter initialEntries={['/gate/return-in/5']}>
        <Routes>
          <Route path="/gate/return-in/:passId" element={<ReturnInFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('will not record a return without a photo of what came back', async () => {
    gatePassFixture = outPass();
    recordReturn.mockResolvedValue(outPass({ status: 'RETURNED' }));
    renderGateIn();

    fireEvent.click(screen.getByRole('button', { name: /record return/i }));
    expect(
      await screen.findByText('Take at least one photo of the material that came back.'),
    ).toBeInTheDocument();
    expect(recordReturn).not.toHaveBeenCalled();

    // No `accept`, so Android offers the camera; a file that is not a photo is dropped.
    const input = screen.getByTestId('returnable-photo-input');
    expect(input).not.toHaveAttribute('accept');
    const challan = new File(['%PDF'], 'challan.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [challan] } });
    expect(screen.queryByAltText('challan.pdf')).not.toBeInTheDocument();

    const returned = photo('back-at-gate.jpg');
    fireEvent.change(input, { target: { files: [returned] } });
    expect(screen.getByAltText('back-at-gate.jpg')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /record return/i }));
    await waitFor(() =>
      expect(recordReturn).toHaveBeenCalledWith(
        expect.objectContaining({ passId: 5, photos: [returned] }),
      ),
    );
  });

  it('shows the photos taken on an earlier trip', () => {
    gatePassFixture = outPass({
      status: 'PARTIALLY_RETURNED',
      return_events: [
        {
          id: 3,
          event_ref: 'RGP/2026-27/000071-R1',
          returned_at: '2026-09-28T08:00:00Z',
          vehicle_number: 'PB10AB1234',
          verified_by_name: 'Guard',
          is_acknowledged: false,
          lines: [],
          attachments: [
            {
              id: 9,
              event: 3,
              file: 'http://api.test/media/returnable-items/returns/front.jpg',
              caption: '',
              created_at: '2026-09-28T08:00:00Z',
              created_by_name: 'Guard',
            },
          ],
        },
      ] as unknown as ReturnableGatePass['return_events'],
    });
    renderGateIn();

    expect(screen.getByAltText('Returned material')).toHaveAttribute(
      'src',
      'http://api.test/media/returnable-items/returns/front.jpg',
    );
  });
});
