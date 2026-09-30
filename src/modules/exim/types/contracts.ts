/**
 * Oil contracts, as the API sends them: SAP's domestic purchase orders for
 * raw-material oil, read live, with every truck against them.
 *
 * Everything here is a worked-out read-out, so figures arrive as NUMBERS.
 * Quantities are in the PO's own unit (`unit`, almost always "MTS"); money is
 * rupees. A contract is one oil on one PO: purchase splits a PO line as trucks
 * arrive, and `po_lines` are the SAP lines it gathers.
 */

/** FOR: the supplier delivers. EXW: we collect and pay the truck. '' = not set yet. */
export type DeliveryTerms = 'FOR' | 'EXW' | '';

/** AWAITING: nothing in yet. ARRIVING: trucks in or at the gate. COMPLETE: nothing left open. */
export type ContractStage = 'AWAITING' | 'ARRIVING' | 'COMPLETE';

export interface ContractTerms {
  delivery_terms: DeliveryTerms;
  /** Rupees per tonne unloaded (EXW). null when never set. */
  freight_per_mt: number | null;
  /** Rupees per tonne loaded. */
  brokerage_per_mt: number | null;
  note: string;
}

/** A truck SAP has received: its GRPO line, costed as EXIM's DC sheet did. */
export interface ReceivedLoad {
  kind: 'RECEIVED';
  grpo_number: string;
  grpo_date: string;
  /** The supplier's invoice number. */
  invoice_no: string;
  vehicle_number: string;
  transporter: string;
  bilty_number: string;
  /** The gate entry it came in on, when the gate booked it here. */
  gate_entry: string | null;
  gate_date: string | null;
  /** What the supplier billed for (value / contract rate). */
  loaded: number;
  /** What was weighed in: the GRPO quantity. */
  unloaded: number;
  shortage: number;
  /** 0.25% of the loaded quantity. */
  allowed: number;
  deduction_qty: number;
  /** The supplier bears the shortage past the allowance, at the contract rate. */
  deduction_amount: number;
  basic: number;
  freight: number;
  brokerage: number;
  landed_total: number;
  landed_per_unit: number | null;
  /** null for a contract not in tonnes (tins, pieces). */
  landed_per_mt: number | null;
  landed_per_litre: number | null;
}

/** A truck the gate has booked that no GRPO has taken in yet. */
export interface GateLoad {
  kind: 'AT_GATE';
  entry_no: string;
  entry_time: string | null;
  /** The gate entry's status: QC_PENDING, QC_COMPLETED, COMPLETED … */
  status: string;
  vehicle_number: string;
  transporter: string;
  invoice_no: string;
  /** The quantity on the supplier's bill, in `billed_unit`. */
  billed: number | null;
  billed_unit: string;
  gross_kg: number | null;
  tare_kg: number | null;
  /** Gross less tare, once the empty truck has been weighed. */
  weighed_kg: number | null;
}

export interface OilContract {
  po_number: string;
  po_lines: number[];
  po_date: string;
  vendor_code: string;
  vendor_name: string;
  item_code: string;
  item_name: string;
  unit: string;
  quantity: number;
  /** The contract rate per unit. */
  rate: number;
  value: number;
  open_qty: number;
  closed: boolean;
  stage: ContractStage;
  received: number;
  loaded: number;
  trucks_received: number;
  trucks_at_gate: number;
  /** Billed quantity of the trucks at the gate. */
  at_gate: number;
  /** Still open in SAP and not at the gate yet. */
  to_come: number;
  deduction_amount: number;
  landed_per_unit: number | null;
  landed_per_mt: number | null;
  landed_per_litre: number | null;
  terms: ContractTerms;
  /** Only on a PO's own page. */
  loads?: ReceivedLoad[];
  at_gate_loads?: GateLoad[];
}

export interface ContractTotals {
  contracts: number;
  open: number;
  value: number;
  contracted_mt: number;
  received_mt: number;
  at_gate_mt: number;
  to_come_mt: number;
  trucks_at_gate: number;
  deduction_amount: number;
  landed_per_mt: number | null;
  landed_per_litre: number | null;
}

export interface ContractRegister {
  /** The year the financial year starts in (2026 = April 2026 to March 2027); null for `open`. */
  year: number | null;
  from: string | null;
  to: string | null;
  open_only: boolean;
  contracts: OilContract[];
  totals: ContractTotals;
}

export interface ContractDetail {
  po_number: string;
  po_date: string;
  vendor_code: string;
  vendor_name: string;
  /** One contract per oil on the PO; nearly always one. */
  lines: OilContract[];
  terms: ContractTerms;
  totals: ContractTotals;
}

export interface ContractTermsPayload {
  delivery_terms: DeliveryTerms;
  freight_per_mt: string;
  brokerage_per_mt: string;
  note?: string;
}
