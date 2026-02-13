import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// Tests — Maintenance ReviewPage (FCV)
// ═══════════════════════════════════════════════════════════════
// Mirrors construction review two-step flow but uses
// maintenanceFullView queries and completeMaintenanceEntry.
// ═══════════════════════════════════════════════════════════════

const content = readFileSync(
  resolve(process.cwd(), 'src/modules/gate/pages/maintenancepages/ReviewPage.tsx'),
  'utf-8',
);

describe('Maintenance ReviewPage', () => {
  // ─── Two-Step Flow: State Management ──────────────────────

  it('has separate isSubmittingSecurity state', () => {
    expect(content).toContain(
      'const [isSubmittingSecurity, setIsSubmittingSecurity] = useState(false)',
    );
  });

  it('has securityJustSubmitted state', () => {
    expect(content).toContain(
      'const [securityJustSubmitted, setSecurityJustSubmitted] = useState(false)',
    );
  });

  it('does NOT have old securityInspectionCompleted state', () => {
    expect(content).not.toContain('securityInspectionCompleted');
  });

  it('does NOT import Switch component', () => {
    expect(content).not.toContain("Switch,\n} from '@/shared/components/ui'");
  });

  // ─── Two-Step Flow: handleSubmitSecurity ──────────────────

  it('defines handleSubmitSecurity function', () => {
    expect(content).toContain('const handleSubmitSecurity = async ()');
  });

  it('handleSubmitSecurity calls securityCheckApi.get', () => {
    expect(content).toContain('securityCheckApi.get(entryIdNumber!)');
  });

  it('handleSubmitSecurity calls securityCheckApi.submit', () => {
    expect(content).toContain('securityCheckApi.submit(securityData.id)');
  });

  it('handleSubmitSecurity sets securityJustSubmitted on success', () => {
    expect(content).toContain('setSecurityJustSubmitted(true)');
  });

  it('handleSubmitSecurity invalidates maintenanceFullView queries', () => {
    expect(content).toContain(
      "queryClient.invalidateQueries({ queryKey: ['maintenanceFullView', entryIdNumber] })",
    );
  });

  it('handleSubmitSecurity catches errors with fallback', () => {
    expect(content).toContain(
      "apiError.message || apiError.detail || 'Failed to submit security check'",
    );
  });

  // ─── Two-Step Flow: handleComplete (separated) ────────────

  it('defines handleComplete separately from security submit', () => {
    expect(content).toContain('const handleComplete = async ()');
  });

  it('handleComplete does NOT call securityCheckApi', () => {
    const handleCompleteBody =
      content.split('const handleComplete = async ()')[1]?.split('const formatDateTime')[0] || '';
    expect(handleCompleteBody).not.toContain('securityCheckApi.get');
    expect(handleCompleteBody).not.toContain('securityCheckApi.submit');
  });

  it('handleComplete calls completeMaintenanceEntry.mutateAsync', () => {
    expect(content).toContain('completeMaintenanceEntry.mutateAsync(entryIdNumber!)');
  });

  // ─── Error Handling: 500 vs non-500 ───────────────────────

  it('imports getErrorMessage utility', () => {
    expect(content).toContain('getErrorMessage');
  });

  it('checks for server error (500) in handleComplete', () => {
    expect(content).toContain('if (checkServerError(error))');
  });

  it('shows generic fallback for 500 errors', () => {
    expect(content).toContain('Cannot complete the entry at the moment. Please try again later.');
  });

  it('shows actual error message for non-500 errors', () => {
    expect(content).toContain("getErrorMessage(error, 'Failed to complete gate entry')");
  });

  // ─── Two-Step Flow: UI ────────────────────────────────────

  it('shows Submit Security button when not submitted', () => {
    expect(content).toContain('!gateEntry?.security_check?.is_submitted && !securityJustSubmitted');
  });

  it('Submit Security button calls handleSubmitSecurity', () => {
    expect(content).toContain('onClick={handleSubmitSecurity}');
  });

  it('shows Complete Entry button after security submitted', () => {
    expect(content).toContain('onClick={handleComplete}');
  });

  it('shows "Ready to complete entry" message', () => {
    expect(content).toContain('Security check submitted. Ready to complete entry.');
  });

  it('shows "Security Inspection Pending" when not submitted', () => {
    expect(content).toContain('Security Inspection Pending');
  });

  it('does NOT have old warning messages', () => {
    expect(content).not.toContain('Security check already submitted');
    expect(content).not.toContain('No security check data found');
    expect(content).not.toContain('Is Security Inspection Completed?');
  });
});
