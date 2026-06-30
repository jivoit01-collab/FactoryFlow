import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// QC inspection report print — file content checks. Direct import
// hangs because these modules pull in lucide-react / @/shared/components/ui,
// so we assert on source like the page tests. The print view, dialog and core
// flow now live in the shared module; GRPO keeps a thin fetch wrapper + a
// re-export of the shared view under the GRPO-specific names.
// ═══════════════════════════════════════════════════════════════

function readSource(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), 'utf-8');
}

describe('useQCReportPrint hook', () => {
  const content = readSource('src/modules/grpo/components/useQCReportPrint.tsx');

  it('loads the inspection report from the GRPO api', () => {
    expect(content).toContain('grpoApi.getInspectionReport');
  });

  it('delegates printing to the shared inspection-report print flow', () => {
    expect(content).toContain('useInspectionReportPrintCore');
    expect(content).toContain('openPrintOptions');
  });

  it('exposes the print trigger, in-flight slip id, modal, portal and error', () => {
    expect(content).toContain('printQCReport');
    expect(content).toContain('printingArrivalSlipId');
    expect(content).toContain('printOptionsModal');
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

describe('GRPO inspection report print view (re-export)', () => {
  const content = readSource('src/modules/grpo/components/QCInspectionReportPrint.tsx');

  it('re-exports the shared print view under the GRPO names', () => {
    expect(content).toContain('GRPOInspectionReportPrintView');
    expect(content).toContain('GRPOInspectionReportPrintStyles');
    expect(content).toContain('@/shared/components/inspection-report-print');
  });
});

describe('shared inspection report print module', () => {
  const view = readSource(
    'src/shared/components/inspection-report-print/InspectionReportPrint.tsx',
  );
  const core = readSource(
    'src/shared/components/inspection-report-print/useInspectionReportPrintCore.tsx',
  );

  it('exports the print view and styles', () => {
    expect(view).toContain('export function InspectionReportPrintView');
    expect(view).toContain('export function InspectionReportPrintStyles');
  });

  it('is print-only via the dedicated css class', () => {
    expect(view).toContain('inspection-report-print');
    expect(view).toContain('@media print');
  });

  it('triggers the browser print dialog and renders via a portal', () => {
    expect(core).toContain('window.print()');
    expect(core).toContain('createPortal');
    expect(core).toContain('InspectionReportPrintView');
  });
});
