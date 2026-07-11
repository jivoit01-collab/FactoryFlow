import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(): string {
  return readFileSync(
    resolve(process.cwd(), 'src/modules/warehouse/grpo/pages/GRPOPreviewPage.tsx'),
    'utf-8',
  );
}

describe('GRPOPreviewPage file content', () => {
  const content = readSource();

  it('exports the preview page', () => {
    expect(content).toContain('export default function GRPOPreviewPage()');
  });

  it('loads GRPO APIs', () => {
    expect(content).toContain('useGRPOPreview');
    expect(content).toContain('usePostGRPO');
    expect(content).not.toContain('useWeighment');
  });

  it('does not track tare weight in the merged GRPO form', () => {
    expect(content).toContain('interface MergedFormState');
    expect(content).not.toContain('tareWeight: string');
    expect(content).not.toContain("tareWeight: prev?.tareWeight ?? ''");
  });

  it('does not render a weighment section in GRPO', () => {
    expect(content).not.toContain('grpoGrossWeight');
    expect(content).not.toContain('grpoTareWeight');
    expect(content).not.toContain('calculatedNetWeight');
  });

  it('does not require tare weight before posting GRPO', () => {
    expect(content).not.toContain('Gate gross weight is required before GRPO');
    expect(content).not.toContain('Tare weight is required');
    expect(content).not.toContain('Tare weight cannot be greater than gross weight');
  });

  it('does not send tare weight with the GRPO post request', () => {
    expect(content).toContain('const result = await postGRPO.mutateAsync');
    expect(content).not.toContain('tare_weight: parseFloat(mergedForm.tareWeight)');
  });

  it('uses combined posting state for buttons', () => {
    expect(content).toContain('const isPosting = postGRPO.isPending');
    expect(content).toContain('disabled={isPosting}');
    expect(content).toContain("'Posting...'");
  });

  it('offers QC inspection report printing from preview via the shared module', () => {
    expect(content).toContain('useQCReportPrint');
    expect(content).toContain('QCReportButton');
    expect(content).toContain('printQCReport');
    expect(content).toContain('{printPortal}');
    expect(content).not.toContain('?print=1');
  });
});
