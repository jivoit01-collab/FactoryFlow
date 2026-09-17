import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BatchNumbersInput } from '../../components/BatchNumbersInput';
import type { GRPOBatchInput } from '../../types';
import { batchesCoverQty, validateBatches } from '../../utils/batchValidation';

// ═══════════════════════════════════════════════════════════════
// Tests — batch (lot) capture on a GRPO line
//
// SAP rejects the WHOLE receipt with -4014 ("cannot add row without complete
// selection of batch/serial numbers") when a batch-managed line names no lot,
// so these guard the checks that stop a post before it reaches SAP.
// ═══════════════════════════════════════════════════════════════

const oneLot = (overrides: Partial<GRPOBatchInput> = {}): GRPOBatchInput => ({
  batch_number: 'AABV/26-27/306',
  quantity: 100,
  ...overrides,
});

describe('validateBatches', () => {
  it('accepts a single lot covering the whole line', () => {
    expect(validateBatches([oneLot()], 100)).toBeNull();
  });

  it('rejects a batch-managed line with no lot at all', () => {
    expect(validateBatches([], 100)).toMatch(/batch \(lot\) number/i);
  });

  it('rejects a blank batch number', () => {
    expect(validateBatches([oneLot({ batch_number: '  ' })], 100)).toMatch(
      /needs a batch number/i,
    );
  });

  it('rejects a zero quantity', () => {
    expect(validateBatches([oneLot({ quantity: 0 })], 100)).toMatch(/greater than zero/i);
  });

  it('rejects the same lot typed twice, whatever the casing', () => {
    const batches = [
      oneLot({ batch_number: 'LOT-A', quantity: 60 }),
      oneLot({ batch_number: 'lot-a', quantity: 40 }),
    ];
    expect(validateBatches(batches, 100)).toMatch(/twice/i);
  });

  it('rejects splits that do not add up to the accepted quantity', () => {
    const batches = [oneLot({ batch_number: 'LOT-A', quantity: 60 })];
    expect(validateBatches(batches, 100)).toMatch(/add up to 60/i);
  });

  it('accepts splits that do add up', () => {
    const batches = [
      oneLot({ batch_number: 'LOT-A', quantity: 60 }),
      oneLot({ batch_number: 'LOT-B', quantity: 40 }),
    ];
    expect(validateBatches(batches, 100)).toBeNull();
  });

  it('tolerates a third-decimal rounding crumb', () => {
    expect(batchesCoverQty([oneLot({ quantity: 99.9995 })], 100)).toBe(true);
    expect(batchesCoverQty([oneLot({ quantity: 99.9 })], 100)).toBe(false);
  });
});

describe('BatchNumbersInput', () => {
  it('renders a row per lot with the number prefilled', () => {
    render(
      <BatchNumbersInput batches={[oneLot()]} acceptedQty={100} uom="KG" onChange={vi.fn()} />,
    );
    expect(screen.getByDisplayValue('AABV/26-27/306')).toBeInTheDocument();
  });

  it('says why the lot is being asked for', () => {
    render(<BatchNumbersInput batches={[oneLot()]} acceptedQty={100} onChange={vi.fn()} />);
    expect(screen.getByText(/rejects the receipt without one/i)).toBeInTheDocument();
  });

  it('splitting adds a row carrying the unallocated quantity', () => {
    const onChange = vi.fn();
    render(
      <BatchNumbersInput
        batches={[oneLot({ quantity: 60 })]}
        acceptedQty={100}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /split/i }));

    expect(onChange).toHaveBeenCalledWith([
      oneLot({ quantity: 60 }),
      { batch_number: '', quantity: 40 },
    ]);
  });

  it('reports the shortfall while splits do not add up', () => {
    render(
      <BatchNumbersInput
        batches={[
          oneLot({ batch_number: 'LOT-A', quantity: 60 }),
          oneLot({ batch_number: 'LOT-B', quantity: 30 }),
        ]}
        acceptedQty={100}
        uom="KG"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/10 left/)).toBeInTheDocument();
  });

  it('keeps a single lot un-removable, so a line cannot lose its batch', () => {
    render(<BatchNumbersInput batches={[oneLot()]} acceptedQty={100} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /remove batch/i })).not.toBeInTheDocument();
  });

  it('surfaces the post-time error next to the inputs', () => {
    render(
      <BatchNumbersInput
        batches={[oneLot()]}
        acceptedQty={100}
        error="Enter the batch (lot) number received."
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Enter the batch (lot) number received.')).toBeInTheDocument();
  });
});

describe('GRPOPreviewPage wiring', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/modules/warehouse/grpo/pages/GRPOPreviewPage.tsx'),
    'utf-8',
  );

  it('collects batches only on lines SAP manages by batch', () => {
    expect(source).toContain('{item.is_batch_managed && (');
    expect(source).toContain('<BatchNumbersInput');
  });

  it('seeds a batch-managed line from the lot QC recorded', () => {
    expect(source).toContain('suggested_batch_number');
  });

  it('sends the batches with the posting request', () => {
    expect(source).toContain('batches: batches.length > 0 ? batches : undefined');
  });

  it('blocks a post — not a draft save — on an incomplete batch', () => {
    expect(source).toContain('if (!forPost || !item.is_batch_managed || accepted <= 0) return;');
  });
});
