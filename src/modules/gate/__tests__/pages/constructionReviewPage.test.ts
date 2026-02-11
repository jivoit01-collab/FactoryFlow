import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — Construction ReviewPage (FCV)
// ═══════════════════════════════════════════════════════════════
// ReviewPage imports from lucide-react, @/shared/components/ui,
// and deep query hooks. File-content verification avoids module
// graph resolution hangs.
// ═══════════════════════════════════════════════════════════════

const content = readFileSync(
  resolve(process.cwd(), 'src/modules/gate/pages/constructionpages/ReviewPage.tsx'),
  'utf-8',
)

describe('Construction ReviewPage', () => {
  // ─── Two-Step Flow: State Management ──────────────────────

  it('has separate isSubmittingSecurity state', () => {
    expect(content).toContain('const [isSubmittingSecurity, setIsSubmittingSecurity] = useState(false)')
  })

  it('has separate isCompleting state', () => {
    expect(content).toContain('const [isCompleting, setIsCompleting] = useState(false)')
  })

  it('has securityJustSubmitted state to track submission', () => {
    expect(content).toContain('const [securityJustSubmitted, setSecurityJustSubmitted] = useState(false)')
  })

  it('does NOT have old securityInspectionCompleted state', () => {
    expect(content).not.toContain('securityInspectionCompleted')
  })

  it('does NOT import Switch component (removed)', () => {
    expect(content).not.toContain("Switch,\n} from '@/shared/components/ui'")
  })

  // ─── Two-Step Flow: handleSubmitSecurity ──────────────────

  it('defines handleSubmitSecurity function', () => {
    expect(content).toContain('const handleSubmitSecurity = async ()')
  })

  it('handleSubmitSecurity checks for entryId', () => {
    expect(content).toMatch(/handleSubmitSecurity[\s\S]*?if \(!entryId\)[\s\S]*?Entry ID is missing/)
  })

  it('handleSubmitSecurity clears errors and sets submitting state', () => {
    expect(content).toContain('setApiErrors({})')
    expect(content).toContain('setIsSubmittingSecurity(true)')
  })

  it('handleSubmitSecurity calls securityCheckApi.get to fetch security ID', () => {
    expect(content).toContain('securityCheckApi.get(entryIdNumber!)')
  })

  it('handleSubmitSecurity checks for missing security ID', () => {
    expect(content).toContain('if (!securityData.id)')
    expect(content).toContain('Security check data not found. Please complete security check first.')
  })

  it('handleSubmitSecurity calls securityCheckApi.submit with security ID', () => {
    expect(content).toContain('securityCheckApi.submit(securityData.id)')
  })

  it('handleSubmitSecurity sets securityJustSubmitted to true on success', () => {
    expect(content).toContain('setSecurityJustSubmitted(true)')
  })

  it('handleSubmitSecurity invalidates constructionFullView queries', () => {
    expect(content).toContain("queryClient.invalidateQueries({ queryKey: ['constructionFullView', entryIdNumber] })")
  })

  it('handleSubmitSecurity catches errors with message or detail fallback', () => {
    expect(content).toContain("apiError.message || apiError.detail || 'Failed to submit security check'")
  })

  it('handleSubmitSecurity resets submitting state in finally block', () => {
    expect(content).toContain('setIsSubmittingSecurity(false)')
  })

  // ─── Two-Step Flow: handleComplete (separated) ────────────

  it('defines handleComplete function separately from security submit', () => {
    expect(content).toContain('const handleComplete = async ()')
  })

  it('handleComplete does NOT call securityCheckApi (security is separate)', () => {
    // handleComplete should only call completeConstructionEntry, not securityCheckApi
    const handleCompleteBody = content.split('const handleComplete = async ()')[1]?.split('const formatDateTime')[0] || ''
    expect(handleCompleteBody).not.toContain('securityCheckApi.get')
    expect(handleCompleteBody).not.toContain('securityCheckApi.submit')
  })

  it('handleComplete calls completeConstructionEntry.mutateAsync', () => {
    expect(content).toContain('completeConstructionEntry.mutateAsync(entryIdNumber!)')
  })

  it('handleComplete shows success screen on completion', () => {
    expect(content).toContain('setShowSuccess(true)')
  })

  // ─── Error Handling: 500 vs non-500 ───────────────────────

  it('imports getErrorMessage utility', () => {
    expect(content).toContain('getErrorMessage')
  })

  it('imports isServerError as checkServerError', () => {
    expect(content).toContain('isServerError as checkServerError')
  })

  it('handleComplete checks for server error (500) first', () => {
    expect(content).toContain('if (checkServerError(error))')
  })

  it('shows generic fallback message for 500 errors', () => {
    expect(content).toContain('Cannot complete the entry at the moment. Please try again later.')
  })

  it('shows actual API error message for non-500 errors', () => {
    expect(content).toContain("getErrorMessage(error, 'Failed to complete gate entry')")
  })

  // ─── Two-Step Flow: UI Buttons ────────────────────────────

  it('shows Submit Security button when security is not submitted', () => {
    expect(content).toContain("!gateEntry?.security_check?.is_submitted && !securityJustSubmitted")
  })

  it('Submit Security button calls handleSubmitSecurity', () => {
    expect(content).toContain('onClick={handleSubmitSecurity}')
  })

  it('Submit Security button is disabled while submitting', () => {
    expect(content).toContain('disabled={isSubmittingSecurity}')
  })

  it('Submit Security button shows "Submitting..." text while loading', () => {
    expect(content).toContain("isSubmittingSecurity ? 'Submitting...' : 'Submit Security'")
  })

  it('shows Complete Entry button after security is submitted', () => {
    expect(content).toContain('onClick={handleComplete}')
  })

  it('Complete Entry button is disabled while completing', () => {
    expect(content).toContain('disabled={isCompleting}')
  })

  it('Complete Entry button shows "Completing..." text while loading', () => {
    expect(content).toContain("isCompleting ? 'Completing...' : 'Complete Entry'")
  })

  // ─── Two-Step Flow: Security Status Display ───────────────

  it('shows submitted status when security is submitted OR just submitted', () => {
    expect(content).toContain("gateEntry.security_check?.is_submitted || securityJustSubmitted")
  })

  it('shows "Ready to complete entry" message after submission', () => {
    expect(content).toContain('Security check submitted. Ready to complete entry.')
  })

  it('shows "Security Inspection Pending" when not submitted', () => {
    expect(content).toContain('Security Inspection Pending')
  })

  it('shows instruction to submit security check', () => {
    expect(content).toContain('Submit security check to proceed with completing the entry')
  })

  it('does NOT have old "Security check already submitted" message', () => {
    expect(content).not.toContain('Security check already submitted')
  })

  it('does NOT have old "No security check data found" warning', () => {
    expect(content).not.toContain('No security check data found')
  })

  it('does NOT have old "Is Security Inspection Completed?" label', () => {
    expect(content).not.toContain('Is Security Inspection Completed?')
  })

  // ─── Icons ────────────────────────────────────────────────

  it('imports ShieldCheck icon for Submit Security button', () => {
    expect(content).toContain('ShieldCheck')
  })

  it('imports CheckCircle2 icon for status display and Complete Entry', () => {
    expect(content).toContain('CheckCircle2')
  })

  // ─── Imports ──────────────────────────────────────────────

  it('imports securityCheckApi', () => {
    expect(content).toContain("import { securityCheckApi } from '../../api/securityCheck/securityCheck.api'")
  })

  it('imports ApiError type', () => {
    expect(content).toContain("import type { ApiError } from '@/core/api/types'")
  })
})
