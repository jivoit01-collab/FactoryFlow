/**
 * The request form's state and the pure rules around it: a blank draft, a
 * draft pre-filled from a tree SAP holds, the first thing wrong with a draft,
 * and the body the server takes.
 *
 * The checks are the ones SAP Portal's page made before submitting
 * (`public/bom.html` `doSubmitCreate` / `doSubmitUpdate`: an item, a name for a
 * new BOM, at least one component with a quantity) plus what the server refuses
 * anyway, so the button can say why it is disabled instead of a 400 saying it.
 */
import type {
  BomKind,
  BomType,
  ChangeRequestPayload,
  IssueMethod,
  LineType,
  SapBom,
  SapBomLine,
} from '../api/bom-changes.api';

export const BOM_TYPES: readonly BomType[] = ['Production', 'Sales', 'Assembly', 'Template'];
export const ISSUE_METHODS: readonly IssueMethod[] = ['Manual', 'Backflush'];
/** SAP Portal cut a line comment to this before sending it; the server refuses longer. */
export const COMMENT_LIMIT = 100;

export interface LineDraft {
  /** A stable React key; never sent. */
  key: string;
  item_type: LineType;
  item_code: string;
  item_name: string;
  /** Shown beside the quantity; never sent (SAP takes the item's own unit). */
  uom: string;
  quantity: string;
  issue_method: IssueMethod;
  warehouse: string;
  unit_cost: string;
  comment: string;
}

export interface RequestDraft {
  kind: BomKind;
  item_code: string;
  item_name: string;
  quantity: string;
  bom_type: BomType;
  warehouse: string;
  distribution_rule: string;
  project: string;
  lines: LineDraft[];
  /** Text lines in the tree SAP holds; a change cannot carry them (see `draftFromSapBom`). */
  droppedTextLines: number;
}

let nextKey = 0;
function newKey(): string {
  nextKey += 1;
  return `line-${nextKey}`;
}

export function blankLine(itemType: LineType = 'item'): LineDraft {
  return {
    key: newKey(),
    item_type: itemType,
    item_code: '',
    item_name: '',
    uom: '',
    quantity: '1',
    issue_method: 'Manual',
    warehouse: '',
    unit_cost: '0',
    comment: '',
  };
}

export function blankDraft(kind: BomKind = 'CREATE'): RequestDraft {
  return {
    kind,
    item_code: '',
    item_name: '',
    quantity: '1',
    bom_type: 'Production',
    warehouse: '',
    distribution_rule: '',
    project: '',
    lines: [blankLine()],
    droppedTextLines: 0,
  };
}

function lineFromSap(line: SapBomLine): LineDraft {
  return {
    key: newKey(),
    item_type: line.item_type === 'resource' ? 'resource' : 'item',
    item_code: line.item_code,
    item_name: line.item_name,
    uom: line.uom,
    quantity: String(line.quantity),
    issue_method: line.issue_method === 'Backflush' ? 'Backflush' : 'Manual',
    warehouse: line.warehouse,
    unit_cost: String(line.unit_cost || 0),
    comment: line.comment ?? '',
  };
}

/**
 * A change to a tree, starting from the tree as SAP holds it — what the
 * portal's "Update BOM" tab loaded. SAP's text lines have no item to send, so
 * they are left out and counted: a change replaces the whole tree, so they
 * would disappear from SAP, and the form says so.
 */
export function draftFromSapBom(tree: SapBom): RequestDraft {
  const lines = tree.lines.filter((line) => line.item_type !== 'text' && line.item_code);
  return {
    kind: 'UPDATE',
    item_code: tree.tree_code,
    item_name: tree.description,
    quantity: String(tree.quantity || 1),
    bom_type: (BOM_TYPES as readonly string[]).includes(tree.bom_type)
      ? (tree.bom_type as BomType)
      : 'Production',
    warehouse: tree.warehouse,
    distribution_rule: tree.distribution_rule,
    project: tree.project,
    lines: lines.length ? lines.map(lineFromSap) : [blankLine()],
    droppedTextLines: tree.lines.length - lines.length,
  };
}

function positive(value: string): boolean {
  const number = Number(value);
  return value.trim() !== '' && Number.isFinite(number) && number > 0;
}

/** Lines the operator has started: a line with no code is an unused blank row. */
export function filledLines(draft: RequestDraft): LineDraft[] {
  return draft.lines.filter((line) => line.item_code.trim());
}

/** The first thing stopping this draft from being sent, or null. */
export function draftError(draft: RequestDraft): string | null {
  const parent = draft.item_code.trim().toUpperCase();
  if (!parent)
    return draft.kind === 'CREATE'
      ? 'Choose the item the BOM is for.'
      : 'Choose the BOM to change.';
  if (draft.kind === 'CREATE' && !draft.item_name.trim()) return 'A new BOM needs the item name.';
  if (!positive(draft.quantity)) return 'The BOM quantity must be above zero.';
  const lines = filledLines(draft);
  if (lines.length === 0) return 'Add at least one component.';
  for (const [index, line] of lines.entries()) {
    const label = `Line ${index + 1} (${line.item_code})`;
    if (!positive(line.quantity)) return `${label}: the quantity must be above zero.`;
    if (line.item_code.trim().toUpperCase() === parent)
      return `${label}: a BOM cannot contain its own item.`;
    if (line.comment.length > COMMENT_LIMIT)
      return `${label}: keep the comment to ${COMMENT_LIMIT} characters.`;
    if (line.unit_cost.trim() !== '' && !(Number(line.unit_cost) >= 0))
      return `${label}: the cost cannot be negative.`;
  }
  return null;
}

/** The body `POST /bom-changes/requests/` (and `direct-push/`) take. */
export function toPayload(draft: RequestDraft, remarks = ''): ChangeRequestPayload {
  return {
    kind: draft.kind,
    item_code: draft.item_code.trim().toUpperCase(),
    item_name: draft.item_name.trim(),
    quantity: draft.quantity.trim(),
    bom_type: draft.bom_type,
    warehouse: draft.warehouse.trim(),
    distribution_rule: draft.distribution_rule.trim(),
    project: draft.project.trim(),
    lines: filledLines(draft).map((line) => ({
      item_type: line.item_type,
      item_code: line.item_code.trim().toUpperCase(),
      item_name: line.item_name.trim(),
      quantity: line.quantity.trim(),
      issue_method: line.issue_method,
      warehouse: line.warehouse.trim(),
      unit_cost: line.unit_cost.trim() || '0',
      comment: line.comment.trim(),
    })),
    ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
  };
}

/** Quantity × unit cost over the item lines, as the portal's "Total Cost". */
export function draftTotalCost(draft: RequestDraft): number {
  return filledLines(draft).reduce((sum, line) => {
    const cost = Number(line.unit_cost) * Number(line.quantity);
    return sum + (Number.isFinite(cost) ? cost : 0);
  }, 0);
}

// ---------------------------------------------------------------------------
// What a change does to the tree
// ---------------------------------------------------------------------------

export type LineChange = 'added' | 'removed' | 'changed' | 'same';

export interface LineDiff {
  item_code: string;
  item_name: string;
  item_type: string;
  before: number | null;
  after: number | null;
  change: LineChange;
}

interface Quantified {
  item_code: string;
  item_name?: string;
  item_type?: string;
  quantity: number | string;
}

function totals(lines: readonly Quantified[]) {
  const map = new Map<string, { name: string; type: string; quantity: number }>();
  for (const line of lines) {
    const code = line.item_code.trim().toUpperCase();
    if (!code) continue;
    const entry = map.get(code) ?? {
      name: line.item_name ?? '',
      type: line.item_type ?? 'item',
      quantity: 0,
    };
    entry.quantity += Number(line.quantity) || 0;
    if (!entry.name && line.item_name) entry.name = line.item_name;
    map.set(code, entry);
  }
  return map;
}

/**
 * The requested lines against the tree SAP holds, by component (a component
 * listed twice is summed). Order: the tree's own order, then what is new.
 */
export function diffLines(
  current: readonly Quantified[],
  requested: readonly Quantified[],
): LineDiff[] {
  const before = totals(current);
  const after = totals(requested);
  const out: LineDiff[] = [];
  for (const [code, was] of before) {
    const now = after.get(code);
    out.push({
      item_code: code,
      item_name: was.name || now?.name || '',
      item_type: was.type,
      before: was.quantity,
      after: now ? now.quantity : null,
      change: !now ? 'removed' : Math.abs(now.quantity - was.quantity) > 1e-9 ? 'changed' : 'same',
    });
  }
  for (const [code, now] of after) {
    if (before.has(code)) continue;
    out.push({
      item_code: code,
      item_name: now.name,
      item_type: now.type,
      before: null,
      after: now.quantity,
      change: 'added',
    });
  }
  return out;
}
