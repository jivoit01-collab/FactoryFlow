import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Shared inspection report print module — file content checks.
// Direct import hangs because these modules pull in lucide-react /
// @/shared/components/ui, so we assert on source like the page tests.
// The print view + hook now live under src/shared/components/print and
// are shared by the GRPO screens and the QC inspection page.
// ═══════════════════════════════════════════════════════════════

function readSource(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), 'utf-8');
}

describe('useInspectionReportPrint hook', () => {
  const content = readSource('src/shared/components/print/useInspectionReportPrint.tsx');

  it('loads the inspection report from the GRPO api', () => {
    expect(content).toContain('grpoApi.getInspectionReport');
  });

  it('opens the print-settings dialog before printing', () => {
    expect(content).toContain('setSettingsOpen(true)');
    expect(content).toContain('PrintSettingsDialog');
  });

  it('triggers the browser print dialog and renders via a portal', () => {
    expect(content).toContain('window.print()');
    expect(content).toContain('createPortal');
    expect(content).toContain('InspectionReportPrintView');
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

describe('InspectionReportPrint view', () => {
  const content = readSource('src/shared/components/print/InspectionReportPrint.tsx');

  it('exports the print view and styles', () => {
    expect(content).toContain('export function InspectionReportPrintView');
    expect(content).toContain('export function InspectionReportPrintStyles');
  });

  it('is print-only via the dedicated css class', () => {
    expect(content).toContain('inspection-report-print');
    expect(content).toContain('@media print');
  });

  it('gates COA, COQ and QC attachment sections behind the print settings', () => {
    expect(content).toContain('settings.printCOA');
    expect(content).toContain('settings.printCOQ');
    expect(content).toContain('settings.printQCAttachments');
  });

  it('renders a QC Attachments section from qc_attachments', () => {
    expect(content).toContain('QC Attachments');
    expect(content).toContain('report.qc_attachments');
  });

  it('renders the Approval Details section', () => {
    expect(content).toContain('Approval Details');
    expect(content).toContain('report.qa_chemist_name');
    expect(content).toContain('report.qam_name');
  });
});

describe('PrintSettingsDialog', () => {
  const content = readSource('src/shared/components/print/PrintSettingsDialog.tsx');

  it('offers COA, COQ and QC attachment toggles', () => {
    expect(content).toContain('Certificate of Analysis (COA)');
    expect(content).toContain('Certificate of Quantity (COQ)');
    expect(content).toContain('QC Attachments');
  });

  it('disables a toggle when its category has no files', () => {
    expect(content).toContain('availability.hasCOA');
    expect(content).toContain('availability.hasCOQ');
    expect(content).toContain('availability.hasQCAttachments');
    expect(content).toContain('disabled={!row.available}');
  });

  it('confirms the print and can cancel', () => {
    expect(content).toContain('onConfirm');
    expect(content).toContain('Cancel');
  });
});
