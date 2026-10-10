import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  TruckDispatchSapReceipt,
  TruckDispatchUpdate,
} from '@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries';

import { DeliverySapReceipts } from '../DeliverySapReceipts';
import { sapReceiptSummary } from '../sapReceiptSummary';

const mockSend = vi.hoisted(() => vi.fn());
const mockUpload = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/modules/gate/api/dispatch-tracking/dispatch-tracking.queries', () => ({
  useSendDeliveryToSap: () => ({ mutateAsync: mockSend, isPending: false }),
  useUploadProof: () => ({ mutateAsync: mockUpload, isPending: false }),
}));

const receipt = (overrides: Partial<TruckDispatchSapReceipt>): TruckDispatchSapReceipt => ({
  id: 1,
  document: 10,
  sap_doc_num: '626100067',
  customer_name: 'MANJEET SINGH SHUNTY',
  company: 'Jivo Beverages',
  status: 'POSTED',
  status_display: 'Received in SAP',
  received_date: '2026-10-10',
  message: 'Bill 626100067 marked received on 10 Oct 2026.',
  posted_at: '2026-10-10T12:00:00',
  ...overrides,
});

const update = (overrides: Partial<TruckDispatchUpdate>): TruckDispatchUpdate => ({
  id: 7,
  status: 'DELIVERED',
  status_display: 'Delivered',
  occurred_at: '2026-10-10T12:00:00',
  expected_reach_date: null,
  delivered_date: '2026-10-10',
  location: '',
  remarks: '',
  proof: 'http://x/media/dispatch_tracking/proof/pod.pdf',
  return_note: null,
  partial_lines: [],
  sap_receipts: [receipt({})],
  created_by_name: 'IT Team',
  created_at: '2026-10-10T12:00:00',
  ...overrides,
});

describe('DeliverySapReceipts', () => {
  beforeEach(() => {
    mockSend.mockReset().mockResolvedValue(update({}));
    mockUpload.mockReset();
  });

  it('renders nothing for an update that opened no receipts', () => {
    const { container } = render(
      <DeliverySapReceipts arrivalId={1} update={update({ sap_receipts: [] })} canUpdate />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows each bill with its SAP state and why, leaving out replaced ones', () => {
    render(
      <DeliverySapReceipts
        arrivalId={1}
        canUpdate
        update={update({
          sap_receipts: [
            receipt({}),
            receipt({
              id: 2,
              sap_doc_num: '626100068',
              status: 'BY_HAND',
              status_display: 'Enter in SAP by hand',
              message: 'none of FG0000328 was received.',
            }),
            receipt({ id: 3, sap_doc_num: '626100001', status: 'SUPERSEDED' }),
          ],
        })}
      />,
    );
    expect(screen.getByText('626100067')).toBeInTheDocument();
    expect(screen.getByText('Received in SAP')).toBeInTheDocument();
    expect(screen.getByText('Enter in SAP by hand')).toBeInTheDocument();
    expect(screen.getByText('none of FG0000328 was received.')).toBeInTheDocument();
    // What was written is already said by the badge; the message is not repeated.
    expect(screen.queryByText(/^Bill 626100067 marked received/)).not.toBeInTheDocument();
    expect(screen.queryByText('626100001')).not.toBeInTheDocument();
  });

  it('asks for the proof when the bills are waiting on it', () => {
    render(
      <DeliverySapReceipts
        arrivalId={1}
        canUpdate
        update={update({
          proof: null,
          sap_receipts: [
            receipt({ status: 'NEEDS_PROOF', status_display: 'Waiting for the proof of delivery' }),
          ],
        })}
      />,
    );
    expect(screen.getByText('Attach proof of delivery')).toBeInTheDocument();
    expect(screen.queryByText('Send to SAP again')).not.toBeInTheDocument();
  });

  it('sends refused bills again', () => {
    render(
      <DeliverySapReceipts
        arrivalId={4}
        canUpdate
        update={update({
          sap_receipts: [receipt({ status: 'REFUSED', status_display: 'Refused by SAP' })],
        })}
      />,
    );
    fireEvent.click(screen.getByText('Send to SAP again'));
    expect(mockSend).toHaveBeenCalledWith({ arrivalId: 4, updateId: 7 });
  });

  it('offers no actions to someone who cannot update tracking', () => {
    render(
      <DeliverySapReceipts
        arrivalId={1}
        canUpdate={false}
        update={update({
          proof: null,
          sap_receipts: [receipt({ status: 'NEEDS_PROOF' }), receipt({ id: 2, status: 'REFUSED' })],
        })}
      />,
    );
    expect(screen.queryByText('Attach proof of delivery')).not.toBeInTheDocument();
    expect(screen.queryByText('Send to SAP again')).not.toBeInTheDocument();
  });
});

describe('sapReceiptSummary', () => {
  it('counts bills by state', () => {
    expect(
      sapReceiptSummary([
        receipt({}),
        receipt({ id: 2 }),
        receipt({ id: 3, status: 'NEEDS_PROOF', status_display: 'Waiting for the proof' }),
      ]),
    ).toBe('2 bills: received in sap · 1 bill: waiting for the proof');
  });
});
