/**
 * The small rules and read-outs the domestic contract screens share: the
 * financial year, a contract's stage and terms in words, its unit, the gate's
 * statuses, and the register's totals worked out again for the contracts a
 * filter leaves.
 *
 * `sumContracts` mirrors the backend's `_totals` (`exim/services_contract.py`),
 * so a filtered register's tiles add up the way the unfiltered ones do.
 */
import type { StatusTone } from '@/shared/components/page';

import type { ContractStage, ContractTotals, DeliveryTerms, OilContract } from '../../types';
import { LITRES_PER_KG } from '../../utils';

/** The first financial year the register can be read for. */
export const FIRST_FINANCIAL_YEAR = 2024;

/** The year today's financial year starts in: April begins it. */
export function currentFinancialYear(today: Date = new Date()): number {
  return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
}

/** Every year the register can be read for, the current one first. */
export function financialYears(today: Date = new Date()): number[] {
  const years: number[] = [];
  for (let year = currentFinancialYear(today); year >= FIRST_FINANCIAL_YEAR; year -= 1) {
    years.push(year);
  }
  return years;
}

/** `2026` reads `2026–27`. */
export function fyLabel(year: number): string {
  return `${year}–${String((year + 1) % 100).padStart(2, '0')}`;
}

export const STAGE_LABEL: Record<ContractStage, string> = {
  AWAITING: 'Awaiting trucks',
  ARRIVING: 'Trucks arriving',
  COMPLETE: 'Complete',
};

export const STAGE_TONE: Record<ContractStage, StatusTone> = {
  AWAITING: 'neutral',
  ARRIVING: 'progress',
  COMPLETE: 'done',
};

/** What needs watching first: trucks on their way, then those not started, then the done. */
export const STAGE_ORDER: Record<ContractStage, number> = {
  ARRIVING: 0,
  AWAITING: 1,
  COMPLETE: 2,
};

export const STAGES: ContractStage[] = ['AWAITING', 'ARRIVING', 'COMPLETE'];

export const TERMS_LABEL: Record<DeliveryTerms, string> = {
  FOR: 'FOR',
  EXW: 'EXW',
  '': 'Terms not set',
};

export const TERMS_MEANING: Record<DeliveryTerms, string> = {
  FOR: 'The supplier delivers; the price includes the freight.',
  EXW: 'We collect the oil and pay the truck.',
  '': 'Nobody has said how this PO is delivered yet.',
};

/** Tonnes in one of a PO's units; null for a unit that is not a weight (tins, pieces). */
const TONNES_PER_UNIT: Record<string, number> = { MTS: 1, MT: 1, KGS: 0.001, KG: 0.001 };

export function tonnesPer(unit: string): number | null {
  return TONNES_PER_UNIT[unit.trim().toUpperCase()] ?? null;
}

/** The unit as a reader writes it: SAP's `MTS` is `MT`, `KGS` is `kg`. */
export function unitLabel(unit: string): string {
  const upper = unit.trim().toUpperCase();
  if (upper === 'MTS' || upper === 'MT') return 'MT';
  if (upper === 'KGS' || upper === 'KG') return 'kg';
  return unit.trim() || 'units';
}

/** Landed cost per tonne, or per the PO's own unit when it is not a weight. */
export function landedOf(contract: {
  landed_per_mt: number | null;
  landed_per_unit: number | null;
  unit: string;
}): { value: number | null; per: string } {
  if (contract.landed_per_mt !== null || tonnesPer(contract.unit) !== null) {
    return { value: contract.landed_per_mt, per: 'MT' };
  }
  return { value: contract.landed_per_unit, per: unitLabel(contract.unit) };
}

/** Share of the contract received, 0 to 1. */
export function receivedShare(received: number, quantity: number): number {
  return quantity > 0 ? Math.max(0, received / quantity) : 0;
}

/** A landed cost worked out without freight: the PO's terms were never set. */
export function leavesOutFreight(contract: OilContract): boolean {
  return contract.terms.delivery_terms === '' && contract.received > 0;
}

/** The register's totals over any set of contracts, as the server works them out. */
export function sumContracts(rows: OilContract[]): ContractTotals {
  let contractedMt = 0;
  let receivedMt = 0;
  let atGateMt = 0;
  let toComeMt = 0;
  let landed = 0;
  for (const row of rows) {
    const perMt = tonnesPer(row.unit);
    if (perMt === null) continue;
    contractedMt += row.quantity * perMt;
    receivedMt += row.received * perMt;
    atGateMt += row.at_gate * perMt;
    toComeMt += row.to_come * perMt;
    if (row.landed_per_mt !== null) landed += row.landed_per_mt * row.received * perMt;
  }
  return {
    contracts: rows.length,
    open: rows.filter((row) => row.stage !== 'COMPLETE').length,
    value: rows.reduce((sum, row) => sum + row.value, 0),
    contracted_mt: contractedMt,
    received_mt: receivedMt,
    at_gate_mt: atGateMt,
    to_come_mt: toComeMt,
    trucks_at_gate: rows.reduce((sum, row) => sum + row.trucks_at_gate, 0),
    deduction_amount: rows.reduce((sum, row) => sum + row.deduction_amount, 0),
    landed_per_mt: receivedMt ? landed / receivedMt : null,
    landed_per_litre: receivedMt ? landed / receivedMt / (LITRES_PER_KG * 1000) : null,
  };
}

/** A gate entry's status, as the gate's own screens say it. */
const GATE_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  DRAFT: { label: 'Booked at the gate', tone: 'neutral' },
  SECURITY_CHECK_DONE: { label: 'Security checked', tone: 'info' },
  ARRIVAL_SLIP_SUBMITTED: { label: 'Arrival slip in', tone: 'info' },
  ARRIVAL_SLIP_REJECTED: { label: 'Arrival slip rejected', tone: 'blocked' },
  IN_PROGRESS: { label: 'Being unloaded', tone: 'progress' },
  QC_PENDING: { label: 'Waiting for QC', tone: 'warn' },
  QC_IN_REVIEW: { label: 'QC checking', tone: 'progress' },
  QC_AWAITING_QAM: { label: 'Waiting for QAM approval', tone: 'warn' },
  QC_REJECTED: { label: 'QC rejected', tone: 'blocked' },
  QC_HOLD: { label: 'QC on hold', tone: 'warn' },
  QC_COMPLETED: { label: 'QC done', tone: 'done' },
  COMPLETED: { label: 'Gate done, no GRPO yet', tone: 'done' },
};

export function gateStatus(status: string): { label: string; tone: StatusTone } {
  const known = GATE_STATUS[status];
  if (known) return known;
  const words = status.replace(/_/g, ' ').trim().toLowerCase();
  return { label: words ? words[0].toUpperCase() + words.slice(1) : '—', tone: 'neutral' };
}

/**
 * The register's address, from the state a register link left on the way to a
 * PO — so Back returns to the year and filters the reader was looking at.
 */
export const REGISTER_PATH = '/exim/domestic-contracts';

export function registerPathFrom(state: unknown): string {
  const back = (state as { back?: unknown } | null)?.back;
  return typeof back === 'string' && back.startsWith('?')
    ? `${REGISTER_PATH}${back}`
    : REGISTER_PATH;
}

export function contractPath(poNumber: string): string {
  return `${REGISTER_PATH}/${encodeURIComponent(poNumber)}`;
}
