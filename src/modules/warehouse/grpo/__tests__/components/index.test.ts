import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// Tests — components/index.ts barrel re-exports
// ═══════════════════════════════════════════════════════════════

describe('GRPO Components Index (barrel re-exports)', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/warehouse/grpo/components/index.ts'),
    'utf-8',
  );

  it('re-exports WarehouseSelect', () => {
    expect(content).toContain('WarehouseSelect');
    expect(content).toContain('./WarehouseSelect');
  });

  it('re-exports the shared QC report print pieces', () => {
    expect(content).toContain('QCReportButton');
    expect(content).toContain('./QCReportButton');
    expect(content).toContain('useQCReportPrint');
    expect(content).toContain('./useQCReportPrint');
    expect(content).toContain('GRPOInspectionReportPrintView');
    expect(content).toContain('./QCInspectionReportPrint');
  });
});
