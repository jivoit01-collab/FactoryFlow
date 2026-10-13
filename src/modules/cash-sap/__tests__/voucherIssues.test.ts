import { describe, expect, it } from 'vitest';

import type { VoucherSapPlan } from '../types';
import { companyName, voucherIssuePoints } from '../utils/voucherIssues';

function voucher(over: Partial<VoucherSapPlan> = {}): VoucherSapPlan {
  return {
    entry_id: 1,
    serial_number: 455,
    entry_date: '2026-09-04',
    bill_date: '2026-09-04',
    gate_entry_no: '',
    supplier_bill_no: '',
    branch_id: 2,
    branch_name: 'Beverage',
    gl_account_code: '5650016',
    gl_account_name: 'REPAIR AND MAINTENANCE PLANT & MACHINERY',
    account_code: '',
    item: '',
    detail: '',
    amount: '90.00',
    sap_company_code: 'JIVO_BEVERAGES',
    routing_id: 1,
    treatment: 'ITEM',
    treatment_source: 'MAP',
    skip_reason: '',
    item_code: 'CG0000004',
    item_name: '',
    warehouse_code: 'BH-FA',
    tax_code: 'IGST@0',
    ocr_code: 'DRINKS',
    ocr_code2: '09-2026',
    ocr_code3: 'Factory',
    ocr_code5: 'HR',
    has_bill: false,
    bill_count: 0,
    overridden: false,
    frozen: false,
    left_out_after_po: false,
    grpo_id: null,
    po_line_num: null,
    warnings: [],
    problems: [],
    ...over,
  };
}

describe('voucherIssuePoints', () => {
  it('says each blocking problem in one plain line, keeping the full message as the detail', () => {
    const points = voucherIssuePoints(
      voucher({
        problems: [
          {
            code: 'GL_NOT_IN_TARGET',
            message: "G/L 5650016 is JIVO_OIL's account. Map it to a JIVO_BEVERAGES account …",
            blocking: true,
          },
          { code: 'NO_BILL', message: 'No bill photo — SAP refuses a GRPO …', blocking: true },
        ],
      }),
    );
    expect(points.map((p) => p.tone)).toEqual(['fix', 'fix']);
    expect(points[0].text).toBe(
      'Account 5650016 is not set up for Jivo Beverages. Set it in Cash → SAP settings.',
    );
    expect(points[0].detail).toContain("JIVO_OIL's account");
    expect(points[1].text).toBe('No bill photo. Add one with ↑ in the Bill column.');
  });

  it('puts what blocks posting first, then the notes and the date warnings', () => {
    const points = voucherIssuePoints(
      voucher({
        problems: [
          { code: 'UNMAPPED_HEAD', message: 'Head 5670001 has no SAP mapping …', blocking: false },
          { code: 'NO_BILL', message: 'No bill photo …', blocking: true },
        ],
        warnings: [
          { code: 'BILL_OTHER_MONTH', field: 'bill_date', message: 'The bill date … month …' },
        ],
      }),
    );
    expect(points.map((p) => p.tone)).toEqual(['fix', 'info', 'info']);
    expect(points[1].text).toBe(
      'This head is not in the SAP map, so it is treated as a service line.',
    );
    expect(points[2].text).toBe('The bill and the voucher are in different months.');
  });

  it("falls back to the backend's message for a code it does not know", () => {
    const [point] = voucherIssuePoints(
      voucher({ problems: [{ code: 'SOMETHING_NEW', message: 'Exactly this.', blocking: true }] }),
    );
    expect(point).toEqual({ tone: 'fix', text: 'Exactly this.', detail: 'Exactly this.' });
  });

  it('keeps the suggested date of a day/month swap', () => {
    const message = '09 Apr 2026 may have day and month swapped — did you mean 04 Sep 2026?';
    const [point] = voucherIssuePoints(
      voucher({ warnings: [{ code: 'LOOKS_SWAPPED', field: 'entry_date', message }] }),
    );
    expect(point.text).toBe(message);
  });

  it('is empty for a clean voucher', () => {
    expect(voucherIssuePoints(voucher())).toEqual([]);
  });
});

describe('companyName', () => {
  it('names the three companies and passes anything else through', () => {
    expect(companyName('JIVO_OIL')).toBe('Jivo Oil');
    expect(companyName('JIVO_BEVERAGES')).toBe('Jivo Beverages');
    expect(companyName('JIVO_MART')).toBe('Jivo Mart');
    expect(companyName('OTHER')).toBe('OTHER');
  });
});
