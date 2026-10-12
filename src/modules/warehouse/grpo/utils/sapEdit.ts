/**
 * What the GRPO edit form changed, as the request the backend checks against
 * SAP: each field's value as the page showed it (`before`) and as typed
 * (`after`). The backend refuses the edit if SAP no longer holds `before`.
 */

import type {
  SapGRPODocument,
  SapGRPOEditRequest,
  SapGRPOFieldValue,
  SapGRPOHeaderField,
} from '../types';

/** A field's value as an input holds it. */
export function toInput(value: SapGRPOFieldValue): string {
  return value === null || value === undefined ? '' : String(value);
}

/** An input's text as the backend takes it for this field. */
export function fromInput(field: Pick<SapGRPOHeaderField, 'type'>, input: string): SapGRPOFieldValue {
  const text = input.trim();
  if (field.type === 'text') return text;
  if (!text) return null;
  if (field.type === 'integer' || field.type === 'choice') return Number(text);
  return text;
}

/** Amounts are compared to the paisa, as SAP's six decimals are shown as two. */
export function sameAmount(a: string | null, b: string): boolean {
  if (a === null) return b.trim() === '';
  const x = Number(a);
  const y = Number(b);
  return Number.isFinite(y) && Math.abs(x - y) < 0.005;
}

export interface FormState {
  header: Record<string, string>;
  amounts: Record<number, string>;
  months: Record<number, string>;
}

export function initialState(doc: SapGRPODocument): FormState {
  return {
    header: Object.fromEntries(doc.header_fields.map((f) => [f.key, toInput(f.value)])),
    amounts: Object.fromEntries(doc.lines.map((l) => [l.line_num, l.amount ?? ''])),
    months: Object.fromEntries(doc.lines.map((l) => [l.line_num, l.month])),
  };
}

export interface BuiltEdit {
  request: SapGRPOEditRequest;
  /** "Vendor Ref. No.: 7320 → 7320A", one per change, for the confirm dialog. */
  changes: { label: string; before: string; after: string }[];
  /** Why it cannot be saved as typed; empty when it can. */
  problems: string[];
}

function shown(value: SapGRPOFieldValue | string): string {
  return value === null || value === '' ? '(empty)' : String(value);
}

export function buildEdit(doc: SapGRPODocument, state: FormState): BuiltEdit {
  const request: SapGRPOEditRequest = { header: {}, lines: [] };
  const changes: BuiltEdit['changes'] = [];
  const problems: string[] = [];

  for (const field of doc.header_fields) {
    const typed = state.header[field.key] ?? '';
    if (typed.trim() === toInput(field.value).trim()) continue;
    if (field.max_length && typed.trim().length > field.max_length) {
      problems.push(`${field.label} takes at most ${field.max_length} characters.`);
    }
    const after = fromInput(field, typed);
    request.header[field.key] = { before: field.value, after };
    const label = field.options?.find((o) => String(o.value) === typed)?.label;
    changes.push({ label: field.label, before: shown(field.value), after: label ?? shown(after) });
  }

  for (const line of doc.lines) {
    if (!line.editable) continue;
    const row = `line ${line.line_num + 1}`;
    const amount = state.amounts[line.line_num] ?? '';
    if (!sameAmount(line.amount, amount)) {
      const value = Number(amount);
      if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
        problems.push(`Amount, ${row} must be a number above 0.`);
      } else {
        request.lines.push({ line_num: line.line_num, field: 'amount', before: line.amount, after: amount.trim() });
        changes.push({ label: `Amount, ${row}`, before: shown(line.amount), after: value.toFixed(2) });
      }
    }
    const month = state.months[line.line_num] ?? '';
    if (month !== line.month) {
      if (!month) {
        problems.push(`Effective month, ${row} cannot be left empty.`);
      } else {
        request.lines.push({ line_num: line.line_num, field: 'month', before: line.month, after: month });
        changes.push({ label: `Effective month, ${row}`, before: shown(line.month), after: month });
      }
    }
  }

  return { request, changes, problems };
}
