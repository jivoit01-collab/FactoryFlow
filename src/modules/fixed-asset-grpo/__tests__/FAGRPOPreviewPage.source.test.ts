import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// FA preview page — source-text checks for what the spec binds:
// the inline multi-file input (not grpo's AttachmentsSection), the local
// "today" for the posting date, the confirm before SAP, the draft reuse,
// and the badges / disabled reason. The page itself is exercised in the
// browser; these lock the choices that would be easy to regress.
// ═══════════════════════════════════════════════════════════════

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf-8');
}

const page = () => readSource('src/modules/fixed-asset-grpo/pages/FAGRPOPreviewPage.tsx');

describe('FAGRPOPreviewPage', () => {
  it('uses an inline <input type="file" multiple>, not AttachmentsSection', () => {
    const content = page();
    expect(content).toContain('type="file"');
    expect(content).toContain('multiple');
    expect(content).not.toContain('AttachmentsSection');
  });

  it('says an empty file box sends the gate photo', () => {
    expect(page()).toContain('Leave empty to send the gate&rsquo;s invoice photo.');
  });

  it('defaults the posting date to the local day and caps it at today', () => {
    const content = page();
    expect(content).toContain('formatDateToISOString(new Date())');
    expect(content).toContain('max={today}');
    expect(content).not.toContain('toISOString().slice(0, 10)');
  });

  it('confirms through confirmSapPost and posts through usePostFAGRPO', () => {
    const content = page();
    expect(content).toContain('confirmSapPost(');
    expect(content).toContain('usePostFAGRPO()');
  });

  it('reuses the open draft and offers to discard it', () => {
    const content = page();
    expect(content).toContain('grpo_posting_id: reusableDraftId(draft)');
    expect(content).toContain('Discard saved draft');
  });

  it('shows the SAP mode badges and the reason Post is disabled', () => {
    const content = page();
    expect(content).toContain('<FASapModeBadges sap={sap} />');
    expect(content).toContain('disabled={!!blockReason');
  });

  it('handles waiting for SAP (202) and already on its way (409)', () => {
    const content = page();
    expect(content).toContain('response.queued');
    expect(content).toContain('sapQueuedConflict(err)');
  });
});

describe('separate mode', () => {
  it('does not use grpo’s own post or draft endpoints', () => {
    const files = [
      'src/modules/fixed-asset-grpo/pages/FAGRPOPreviewPage.tsx',
      'src/modules/fixed-asset-grpo/api/faGrpo.api.ts',
      'src/modules/fixed-asset-grpo/components/FAGRPOPrintButton.tsx',
    ];
    for (const file of files) {
      const content = readSource(file);
      expect(content).not.toContain('grpoApi.');
      expect(content).not.toContain('/grpo/post/');
    }
  });
});
