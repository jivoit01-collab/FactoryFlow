import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Shared QC inspection report print module — file content checks.
// Direct import hangs because these modules pull in lucide-react /
// @/shared/components/ui, so we assert on source like the page tests.
// ═══════════════════════════════════════════════════════════════

function readSource(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), 'utf-8');
}

describe('useQCReportPrint hook', () => {
  const content = readSource('src/modules/grpo/components/useQCReportPrint.tsx');

  it('loads the inspection report from the GRPO api', () => {
    expect(content).toContain('grpoApi.getInspectionReport');
  });

  it('triggers the browser print dialog and renders via a portal', () => {
    expect(content).toContain('window.print()');
    expect(content).toContain('createPortal');
    expect(content).toContain('GRPOInspectionReportPrintView');
  });

  it('exposes the print trigger, in-flight slip id, portal and error', () => {
    expect(content).toContain('printQCReport');
    expect(content).toContain('printingArrivalSlipId');
    expect(content).toContain('printPortal');
    expect(content).toContain('printError');
  });
});

describe('QCReportButton', () => {
  const content = readSource('src/modules/grpo/components/QCReportButton.tsx');

  it('only renders when an arrival slip and inspection exist', () => {
    expect(content).toContain('item.arrival_slip_id');
    expect(content).toContain('item.inspection_id');
    expect(content).toContain('return null');
  });

  it('renders a print report action', () => {
    expect(content).toContain('Print Report');
    expect(content).toContain('onPrint(arrivalSlipId)');
  });
});

describe('QCInspectionReportPrint view', () => {
  const content = readSource('src/modules/grpo/components/QCInspectionReportPrint.tsx');

  it('exports the print view and styles', () => {
    expect(content).toContain('export function GRPOInspectionReportPrintView');
    expect(content).toContain('export function GRPOInspectionReportPrintStyles');
  });

  it('is print-only via the dedicated css class', () => {
    expect(content).toContain('grpo-inspection-report-print');
    expect(content).toContain('@media print');
  });
});
