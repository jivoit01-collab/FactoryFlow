import type { SapGRPODocument } from '../types';

/** A service GRPO as the edit screen's API returns it: line 1 open, line 2 invoiced. */
export function serviceGRPO(overrides: Partial<SapGRPODocument> = {}): SapGRPODocument {
  return {
    doc_entry: 501,
    doc_num: 2026106504,
    doc_type: 'S',
    doc_type_label: 'Service',
    doc_status: 'O',
    cancelled: false,
    doc_date: '2026-10-10',
    card_code: 'VENDA000956',
    card_name: 'ARNAV TRANSPORT SERVICE',
    branch_name: 'FACTORY',
    doc_total: '4125.00',
    vat_sum: '0.00',
    created_by: 'GURCHARAN',
    created_on: '2026-10-10',
    can_edit: true,
    permission_message: '',
    blocked_reason: '',
    back_date: null,
    header_fields: [
      { key: 'vendor_ref', label: 'Vendor Ref. No.', type: 'text', max_length: 100, value: '7320' },
      { key: 'document_date', label: 'Document Date', type: 'date', max_length: null, value: '2026-10-10' },
      {
        key: 'contact_person',
        label: 'Contact Person',
        type: 'choice',
        max_length: null,
        value: null,
        options: [{ value: 7, label: 'AMIT' }],
      },
      { key: 'remarks', label: 'Remarks', type: 'text', max_length: 254, value: 'BILTY NO 7320' },
      { key: 'U_VehicleNoM', label: 'Vehicle Number', type: 'text', max_length: 12, value: '' },
    ],
    line_fields: [
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'month', label: 'Effective Month', type: 'choice' },
    ],
    month_options: [
      { code: '10-2026', name: '10-2026' },
      { code: '09-2026', name: '09-2026' },
    ],
    lines: [
      {
        line_num: 0, item_code: '', description: 'EDIBLE OIL', quantity: '0', unit_price: '2769.00',
        discount_percent: '0', amount: '2769.00', tax_amount: '138.45', tax_code: 'RIGST@5',
        gl_account: '5670001', variety: 'MUSTARD', month: '10-2026', budget: 'Del Bkhp',
        line_status: 'O', closed_reason: '', ap_invoice_doc_num: null, editable: true,
      },
      {
        line_num: 1, item_code: '', description: 'EDIBLE OIL', quantity: '0', unit_price: '1356.00',
        discount_percent: '0', amount: '1356.00', tax_amount: '67.80', tax_code: 'RIGST@5',
        gl_account: '5670001', variety: 'OLIVE', month: '10-2026', budget: 'Del Bkhp',
        line_status: 'C', closed_reason: 'Closed by A/P invoice 52410.', ap_invoice_doc_num: 52410,
        editable: false,
      },
    ],
    attachments: [],
    attachments_shared_message: '',
    edits: [],
    material_posting_id: null,
    service_posting_id: null,
    ...overrides,
  };
}
