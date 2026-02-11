import { describe, it, expect, vi } from 'vitest'

vi.mock('@/config/constants', () => ({
  VALIDATION_MESSAGES: {
    required: (f: string) => `${f} is required`,
    minLength: (f: string, n: number) => `${f} must be at least ${n} characters`,
    maxLength: (f: string, n: number) => `${f} must be at most ${n} characters`,
    invalidPhone: 'Please enter a valid phone number',
  },
  VALIDATION_LIMITS: { name: { min: 2, max: 100 } },
  VALIDATION_PATTERNS: {
    phone: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
    aadhar: /^[0-9]{12}$/,
    panCard: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    voterId: /^[A-Z]{3}[0-9]{7}$/,
    drivingLicense: /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/,
  },
}))

import {
  driverSchema,
  ID_PROOF_TYPES,
  ID_PROOF_VALIDATION,
} from '../../schemas/driver.schema'

// Helper to build a valid driver object
function makeValidDriver(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Rajesh Kumar',
    mobile_no: '9876543210',
    license_no: 'MH0220150001234',
    id_proof_type: 'Aadhar',
    id_proof_number: '123456789012',
    ...overrides,
  }
}

describe('Driver Schema', () => {
  // ═══════════════════════════════════════════════════════════════
  // Valid Input
  // ═══════════════════════════════════════════════════════════════

  describe('valid input', () => {
    it('accepts a valid driver with Aadhar ID proof', () => {
      const result = driverSchema.safeParse(makeValidDriver())
      expect(result.success).toBe(true)
    })

    it('accepts a valid driver with optional photo omitted', () => {
      const result = driverSchema.safeParse(makeValidDriver())
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.photo).toBeUndefined()
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Name Validation
  // ═══════════════════════════════════════════════════════════════

  describe('name validation', () => {
    it('rejects empty name', () => {
      const result = driverSchema.safeParse(makeValidDriver({ name: '' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const nameErrors = result.error.issues.filter((i) => i.path.includes('name'))
        expect(nameErrors.length).toBeGreaterThan(0)
      }
    })

    it('rejects name that is too short (1 character)', () => {
      const result = driverSchema.safeParse(makeValidDriver({ name: 'A' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const nameErrors = result.error.issues.filter((i) => i.path.includes('name'))
        expect(nameErrors.length).toBeGreaterThan(0)
        expect(nameErrors[0].message).toContain('at least 2 characters')
      }
    })

    it('rejects name that is too long (over 100 characters)', () => {
      const longName = 'A'.repeat(101)
      const result = driverSchema.safeParse(makeValidDriver({ name: longName }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const nameErrors = result.error.issues.filter((i) => i.path.includes('name'))
        expect(nameErrors.length).toBeGreaterThan(0)
        expect(nameErrors[0].message).toContain('at most 100 characters')
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Mobile Number Validation
  // ═══════════════════════════════════════════════════════════════

  describe('mobile_no validation', () => {
    it('rejects empty mobile number', () => {
      const result = driverSchema.safeParse(makeValidDriver({ mobile_no: '' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const mobileErrors = result.error.issues.filter((i) => i.path.includes('mobile_no'))
        expect(mobileErrors.length).toBeGreaterThan(0)
      }
    })

    it('rejects invalid mobile number format', () => {
      const result = driverSchema.safeParse(makeValidDriver({ mobile_no: '12345' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const mobileErrors = result.error.issues.filter((i) => i.path.includes('mobile_no'))
        expect(mobileErrors.length).toBeGreaterThan(0)
        expect(mobileErrors[0].message).toBe('Please enter a valid phone number')
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // License Number Validation
  // ═══════════════════════════════════════════════════════════════

  describe('license_no validation', () => {
    it('rejects empty license number', () => {
      const result = driverSchema.safeParse(makeValidDriver({ license_no: '' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const licenseErrors = result.error.issues.filter((i) => i.path.includes('license_no'))
        expect(licenseErrors.length).toBeGreaterThan(0)
      }
    })

    it('rejects invalid license number format', () => {
      const result = driverSchema.safeParse(makeValidDriver({ license_no: 'INVALID' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const licenseErrors = result.error.issues.filter((i) => i.path.includes('license_no'))
        expect(licenseErrors.length).toBeGreaterThan(0)
        expect(licenseErrors[0].message).toContain('License must be in format')
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // ID Proof Validation (superRefine)
  // ═══════════════════════════════════════════════════════════════

  describe('ID proof validation', () => {
    it('accepts a valid Aadhar number (12 digits)', () => {
      const result = driverSchema.safeParse(
        makeValidDriver({ id_proof_type: 'Aadhar', id_proof_number: '123456789012' })
      )
      expect(result.success).toBe(true)
    })

    it('rejects an invalid Aadhar number', () => {
      const result = driverSchema.safeParse(
        makeValidDriver({ id_proof_type: 'Aadhar', id_proof_number: '12345' })
      )
      expect(result.success).toBe(false)
      if (!result.success) {
        const idErrors = result.error.issues.filter((i) => i.path.includes('id_proof_number'))
        expect(idErrors.length).toBeGreaterThan(0)
        expect(idErrors[0].message).toBe('Aadhar number must be exactly 12 digits')
      }
    })

    it('accepts a valid PAN Card number', () => {
      const result = driverSchema.safeParse(
        makeValidDriver({ id_proof_type: 'PAN Card', id_proof_number: 'ABCDE1234F' })
      )
      expect(result.success).toBe(true)
    })

    it('rejects an invalid PAN Card number', () => {
      const result = driverSchema.safeParse(
        makeValidDriver({ id_proof_type: 'PAN Card', id_proof_number: '12345' })
      )
      expect(result.success).toBe(false)
      if (!result.success) {
        const idErrors = result.error.issues.filter((i) => i.path.includes('id_proof_number'))
        expect(idErrors.length).toBeGreaterThan(0)
        expect(idErrors[0].message).toBe(
          'PAN must be 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)'
        )
      }
    })

    it('accepts a valid Voter ID number', () => {
      const result = driverSchema.safeParse(
        makeValidDriver({ id_proof_type: 'Voter ID', id_proof_number: 'ABC1234567' })
      )
      expect(result.success).toBe(true)
    })

    it('rejects an invalid Voter ID number', () => {
      const result = driverSchema.safeParse(
        makeValidDriver({ id_proof_type: 'Voter ID', id_proof_number: '12345' })
      )
      expect(result.success).toBe(false)
      if (!result.success) {
        const idErrors = result.error.issues.filter((i) => i.path.includes('id_proof_number'))
        expect(idErrors.length).toBeGreaterThan(0)
        expect(idErrors[0].message).toBe(
          'Voter ID must be 3 letters + 7 digits (e.g., ABC1234567)'
        )
      }
    })

    it('accepts Other ID proof with at least 5 characters', () => {
      const result = driverSchema.safeParse(
        makeValidDriver({ id_proof_type: 'Other', id_proof_number: 'ABCDE' })
      )
      expect(result.success).toBe(true)
    })

    it('rejects Other ID proof with fewer than 5 characters', () => {
      const result = driverSchema.safeParse(
        makeValidDriver({ id_proof_type: 'Other', id_proof_number: 'ABCD' })
      )
      expect(result.success).toBe(false)
      if (!result.success) {
        const idErrors = result.error.issues.filter((i) => i.path.includes('id_proof_number'))
        expect(idErrors.length).toBeGreaterThan(0)
        expect(idErrors[0].message).toBe('ID proof number must be at least 5 characters')
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // ID_PROOF_TYPES
  // ═══════════════════════════════════════════════════════════════

  describe('ID_PROOF_TYPES', () => {
    it('contains exactly 4 ID proof types', () => {
      expect(ID_PROOF_TYPES).toHaveLength(4)
    })

    it('includes Aadhar, PAN Card, Voter ID, and Other', () => {
      expect(ID_PROOF_TYPES).toContain('Aadhar')
      expect(ID_PROOF_TYPES).toContain('PAN Card')
      expect(ID_PROOF_TYPES).toContain('Voter ID')
      expect(ID_PROOF_TYPES).toContain('Other')
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // ID_PROOF_VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('ID_PROOF_VALIDATION', () => {
    it('has validation config for Aadhar with pattern, message, and placeholder', () => {
      expect(ID_PROOF_VALIDATION.Aadhar).toBeDefined()
      expect(ID_PROOF_VALIDATION.Aadhar.pattern).toBeInstanceOf(RegExp)
      expect(ID_PROOF_VALIDATION.Aadhar.message).toBeTruthy()
      expect(ID_PROOF_VALIDATION.Aadhar.placeholder).toBeTruthy()
    })

    it('has validation config for PAN Card with pattern, message, and placeholder', () => {
      expect(ID_PROOF_VALIDATION['PAN Card']).toBeDefined()
      expect(ID_PROOF_VALIDATION['PAN Card'].pattern).toBeInstanceOf(RegExp)
      expect(ID_PROOF_VALIDATION['PAN Card'].message).toBeTruthy()
      expect(ID_PROOF_VALIDATION['PAN Card'].placeholder).toBeTruthy()
    })

    it('has validation config for Voter ID with pattern, message, and placeholder', () => {
      expect(ID_PROOF_VALIDATION['Voter ID']).toBeDefined()
      expect(ID_PROOF_VALIDATION['Voter ID'].pattern).toBeInstanceOf(RegExp)
      expect(ID_PROOF_VALIDATION['Voter ID'].message).toBeTruthy()
      expect(ID_PROOF_VALIDATION['Voter ID'].placeholder).toBeTruthy()
    })

    it('has validation config for Other with null pattern and a placeholder', () => {
      expect(ID_PROOF_VALIDATION.Other).toBeDefined()
      expect(ID_PROOF_VALIDATION.Other.pattern).toBeNull()
      expect(ID_PROOF_VALIDATION.Other.placeholder).toBeTruthy()
    })
  })
})
