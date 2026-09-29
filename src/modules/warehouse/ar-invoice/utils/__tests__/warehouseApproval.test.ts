import { describe, expect, it } from 'vitest';

import type { ARInvoicePosting, ARInvoiceWarehouseApproval } from '../../types';
import { heldForApprovalMessage, warehousesNeedingApproval } from '../warehouseApproval';

const managesOnly =
  (...codes: string[]) =>
  (code?: string | null) =>
    !!code && codes.includes(code);

function approval(over: Partial<ARInvoiceWarehouseApproval>): ARInvoiceWarehouseApproval {
  return {
    id: 1,
    warehouse_code: 'BH-PTD',
    status: 'PENDING',
    status_display: 'Pending',
    decided_by_name: null,
    decided_at: null,
    remarks: '',
    approvers: [],
    ...over,
  };
}

describe('warehousesNeedingApproval', () => {
  it('names only the warehouses the raiser does not manage, once each', () => {
    expect(
      warehousesNeedingApproval(['GP-FG', 'bh-ptd', 'BH-PTD', 'BH-SC'], managesOnly('GP-FG')),
    ).toEqual(['BH-PTD', 'BH-SC']);
  });

  it('asks for nothing when every line is from a managed warehouse', () => {
    expect(warehousesNeedingApproval(['GP-FG'], managesOnly('GP-FG'))).toEqual([]);
  });

  it('ignores lines with no warehouse', () => {
    expect(warehousesNeedingApproval([null, '', undefined], managesOnly())).toEqual([]);
  });
});

describe('heldForApprovalMessage', () => {
  it('says whom the counter is waiting on', () => {
    const posting = {
      warehouse_approvals: [approval({ approvers: ['Gautam Chanana'] })],
    } as ARInvoicePosting;
    expect(heldForApprovalMessage(posting)).toContain('BH-PTD (Gautam Chanana)');
  });

  it('says so when the warehouse has nobody who can approve', () => {
    const posting = { warehouse_approvals: [approval({})] } as ARInvoicePosting;
    expect(heldForApprovalMessage(posting)).toContain('ask an administrator');
  });

  it('leaves out warehouses that have already approved', () => {
    const posting = {
      warehouse_approvals: [
        approval({ id: 1, warehouse_code: 'BH-SC', status: 'APPROVED', approvers: [] }),
        approval({ id: 2, approvers: ['Gautam Chanana'] }),
      ],
    } as ARInvoicePosting;
    const message = heldForApprovalMessage(posting);
    expect(message).not.toContain('BH-SC');
    expect(message).toContain('BH-PTD');
  });
});
