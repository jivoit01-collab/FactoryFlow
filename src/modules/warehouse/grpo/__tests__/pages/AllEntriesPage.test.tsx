import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(): string {
  return readFileSync(resolve(process.cwd(), 'src/modules/warehouse/grpo/pages/AllEntriesPage.tsx'), 'utf-8');
}

describe('AllEntriesPage file content', () => {
  const content = readSource();

  it('exports the All Entries page', () => {
    expect(content).toContain('export default function AllEntriesPage(');
  });

  it('loads all GRPO entries', () => {
    expect(content).toContain('useAllGRPOEntries');
  });

  it('supports expanding a row to show its QC breakdown', () => {
    expect(content).toContain('toggleExpanded');
    expect(content).toContain('entry.po_receipts');
    expect(content).toContain('<BillQCCard');
  });

  it('renders per-item QC verdicts via the shared QCStatusBadge', () => {
    expect(content).toContain("import { QCStatusBadge } from '../components'");
    expect(content).toContain('<QCStatusBadge status={item.qc_status}');
  });

  it('lets a ready, unposted bill jump to the posting preview', () => {
    expect(content).toContain('po.is_ready_for_grpo && !po.is_posted');
    expect(content).toContain('/warehouse/grpo/material/preview/${entry.vehicle_entry_id}');
  });

  it('surfaces the QC quantity split for rejected items', () => {
    expect(content).toContain('Rejected:');
  });
});
