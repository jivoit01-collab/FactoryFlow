import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — Raw Material ReviewPage (FCV)
// ═══════════════════════════════════════════════════════════════
// Raw materials already had the two-step flow pattern. This test
// verifies the updated error handling (500 vs non-500) that was
// applied in the latest refactor.
// ═══════════════════════════════════════════════════════════════

const content = readFileSync(
  resolve(process.cwd(), 'src/modules/gate/pages/rawmaterialpages/ReviewPage.tsx'),
  'utf-8',
)

describe('Raw Material ReviewPage', () => {
  // ─── Error Handling: Updated 500 vs non-500 ───────────────

  it('imports getErrorMessage utility', () => {
    expect(content).toContain('getErrorMessage')
  })

  it('imports isServerError as checkServerError', () => {
    expect(content).toContain('isServerError as checkServerError')
  })

  it('handleComplete checks for server error (500) first', () => {
    expect(content).toContain('if (checkServerError(error))')
  })

  it('shows generic fallback for 500 server errors', () => {
    expect(content).toContain('Cannot complete the entry at the moment. Please try again later.')
  })

  it('uses getErrorMessage for non-500 errors', () => {
    expect(content).toContain("getErrorMessage(error, 'Failed to complete gate entry')")
  })

  it('does NOT log error to console.error anymore', () => {
    expect(content).not.toContain('console.error')
  })

  // ─── Existing Two-Step Flow (already present) ─────────────

  it('has handleSubmitSecurity function', () => {
    expect(content).toContain('const handleSubmitSecurity = async ()')
  })

  it('has handleComplete function', () => {
    expect(content).toContain('const handleComplete = async ()')
  })

  it('has securityJustSubmitted state', () => {
    expect(content).toContain('securityJustSubmitted')
  })

  it('has isSubmittingSecurity state', () => {
    expect(content).toContain('isSubmittingSecurity')
  })

  it('calls completeGateEntry.mutateAsync in handleComplete', () => {
    expect(content).toContain('completeGateEntry.mutateAsync(entryIdNumber!)')
  })

  it('handleComplete does NOT call securityCheckApi', () => {
    const handleCompleteBody = content.split('const handleComplete = async ()')[1]?.split('const formatDateTime')[0] || ''
    expect(handleCompleteBody).not.toContain('securityCheckApi.get')
    expect(handleCompleteBody).not.toContain('securityCheckApi.submit')
  })
})
