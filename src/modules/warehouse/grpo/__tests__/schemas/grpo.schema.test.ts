import { describe, it, expect } from 'vitest';
import { grpoPostItemSchema, grpoPostSchema } from '../../schemas/grpo.schema';

// ═══════════════════════════════════════════════════════════════
// grpoPostItemSchema
// ═══════════════════════════════════════════════════════════════

describe('grpoPostItemSchema', () => {
  // ─── Valid Input ────────────────────────────────────────────

  it('accepts a valid item with positive qty', () => {
    const result = grpoPostItemSchema.safeParse({
      po_item_receipt_id: 1,
      accepted_qty: 10,
    });
    expect(result.success).toBe(true);
  });

  it('accepts zero accepted_qty', () => {
    const result = grpoPostItemSchema.safeParse({
      po_item_receipt_id: 1,
      accepted_qty: 0,
    });
    expect(result.success).toBe(true);
  });

  // ─── Invalid Input ─────────────────────────────────────────

  it('rejects negative accepted_qty', () => {
    const result = grpoPostItemSchema.safeParse({
      po_item_receipt_id: 1,
      accepted_qty: -5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing po_item_receipt_id', () => {
    const result = grpoPostItemSchema.safeParse({
      accepted_qty: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing accepted_qty', () => {
    const result = grpoPostItemSchema.safeParse({
      po_item_receipt_id: 1,
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// grpoPostSchema
// ═══════════════════════════════════════════════════════════════

describe('grpoPostSchema', () => {
  const validData = {
    vehicle_entry_id: 100,
    po_receipt_id: 200,
    items: [{ po_item_receipt_id: 1, accepted_qty: 10 }],
    branch_id: 2,
  };

  // ─── Valid Input ────────────────────────────────────────────

  it('accepts valid complete data', () => {
    const result = grpoPostSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts data with optional warehouse_code', () => {
    const result = grpoPostSchema.safeParse({
      ...validData,
      warehouse_code: 'WH-001',
    });
    expect(result.success).toBe(true);
  });

  it('accepts data with optional comments', () => {
    const result = grpoPostSchema.safeParse({
      ...validData,
      comments: 'Posting for delivery',
    });
    expect(result.success).toBe(true);
  });

  it('accepts data with both optional fields', () => {
    const result = grpoPostSchema.safeParse({
      ...validData,
      warehouse_code: 'WH-001',
      comments: 'Posting note',
    });
    expect(result.success).toBe(true);
  });

  it('accepts multiple items when at least one has accepted_qty > 0', () => {
    const result = grpoPostSchema.safeParse({
      ...validData,
      items: [
        { po_item_receipt_id: 1, accepted_qty: 0 },
        { po_item_receipt_id: 2, accepted_qty: 5 },
      ],
    });
    expect(result.success).toBe(true);
  });

  // ─── Invalid Input ─────────────────────────────────────────

  it('rejects empty items array', () => {
    const result = grpoPostSchema.safeParse({
      ...validData,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects when all items have accepted_qty = 0 (refinement)', () => {
    const result = grpoPostSchema.safeParse({
      ...validData,
      items: [
        { po_item_receipt_id: 1, accepted_qty: 0 },
        { po_item_receipt_id: 2, accepted_qty: 0 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing vehicle_entry_id', () => {
    const { vehicle_entry_id, ...withoutVehicle } = validData;
    const result = grpoPostSchema.safeParse(withoutVehicle);
    expect(result.success).toBe(false);
  });

  it('rejects missing po_receipt_id', () => {
    const { po_receipt_id, ...withoutPo } = validData;
    const result = grpoPostSchema.safeParse(withoutPo);
    expect(result.success).toBe(false);
  });

  it('rejects missing branch_id', () => {
    const { branch_id, ...withoutBranch } = validData;
    const result = grpoPostSchema.safeParse(withoutBranch);
    expect(result.success).toBe(false);
  });

  it('rejects missing items', () => {
    const { items, ...withoutItems } = validData;
    const result = grpoPostSchema.safeParse(withoutItems);
    expect(result.success).toBe(false);
  });

  // ─── Refinement Error Path ──────────────────────────────────

  it('refinement error targets items path', () => {
    const result = grpoPostSchema.safeParse({
      ...validData,
      items: [{ po_item_receipt_id: 1, accepted_qty: 0 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const itemsError = result.error.issues.find((i) => i.path.includes('items'));
      expect(itemsError).toBeDefined();
    }
  });
});
