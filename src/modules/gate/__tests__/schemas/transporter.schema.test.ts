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
  },
}))

import { transporterSchema } from '../../schemas/transporter.schema'

// Helper to build a valid transporter object
function makeValidTransporter(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Sharma Transport Co.',
    contact_person: 'Anil Sharma',
    mobile_no: '9876543210',
    ...overrides,
  }
}

describe('Transporter Schema', () => {
  // ═══════════════════════════════════════════════════════════════
  // Valid Input
  // ═══════════════════════════════════════════════════════════════

  describe('valid input', () => {
    it('accepts a fully valid transporter object', () => {
      const result = transporterSchema.safeParse(makeValidTransporter())
      expect(result.success).toBe(true)
    })

    it('returns parsed data matching the input', () => {
      const input = makeValidTransporter()
      const result = transporterSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe(input.name)
        expect(result.data.contact_person).toBe(input.contact_person)
        expect(result.data.mobile_no).toBe(input.mobile_no)
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Name Validation
  // ═══════════════════════════════════════════════════════════════

  describe('name validation', () => {
    it('rejects empty name', () => {
      const result = transporterSchema.safeParse(makeValidTransporter({ name: '' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const nameErrors = result.error.issues.filter((i) => i.path.includes('name'))
        expect(nameErrors.length).toBeGreaterThan(0)
      }
    })

    it('rejects name that is too short (1 character)', () => {
      const result = transporterSchema.safeParse(makeValidTransporter({ name: 'A' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const nameErrors = result.error.issues.filter((i) => i.path.includes('name'))
        expect(nameErrors.length).toBeGreaterThan(0)
        expect(nameErrors[0].message).toContain('at least 2 characters')
      }
    })

    it('rejects name that is too long (over 100 characters)', () => {
      const longName = 'A'.repeat(101)
      const result = transporterSchema.safeParse(makeValidTransporter({ name: longName }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const nameErrors = result.error.issues.filter((i) => i.path.includes('name'))
        expect(nameErrors.length).toBeGreaterThan(0)
        expect(nameErrors[0].message).toContain('at most 100 characters')
      }
    })

    it('accepts a name with exactly 2 characters', () => {
      const result = transporterSchema.safeParse(makeValidTransporter({ name: 'AB' }))
      expect(result.success).toBe(true)
    })

    it('accepts a name with exactly 100 characters', () => {
      const result = transporterSchema.safeParse(makeValidTransporter({ name: 'A'.repeat(100) }))
      expect(result.success).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Contact Person Validation
  // ═══════════════════════════════════════════════════════════════

  describe('contact_person validation', () => {
    it('rejects empty contact person', () => {
      const result = transporterSchema.safeParse(makeValidTransporter({ contact_person: '' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path.includes('contact_person'))
        expect(errors.length).toBeGreaterThan(0)
      }
    })

    it('rejects contact person that is too short (1 character)', () => {
      const result = transporterSchema.safeParse(makeValidTransporter({ contact_person: 'B' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path.includes('contact_person'))
        expect(errors.length).toBeGreaterThan(0)
        expect(errors[0].message).toContain('at least 2 characters')
      }
    })

    it('rejects contact person that is too long (over 100 characters)', () => {
      const longName = 'B'.repeat(101)
      const result = transporterSchema.safeParse(makeValidTransporter({ contact_person: longName }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path.includes('contact_person'))
        expect(errors.length).toBeGreaterThan(0)
        expect(errors[0].message).toContain('at most 100 characters')
      }
    })

    it('accepts contact person with exactly 2 characters', () => {
      const result = transporterSchema.safeParse(makeValidTransporter({ contact_person: 'AB' }))
      expect(result.success).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Mobile Number Validation
  // ═══════════════════════════════════════════════════════════════

  describe('mobile_no validation', () => {
    it('rejects empty mobile number', () => {
      const result = transporterSchema.safeParse(makeValidTransporter({ mobile_no: '' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const mobileErrors = result.error.issues.filter((i) => i.path.includes('mobile_no'))
        expect(mobileErrors.length).toBeGreaterThan(0)
      }
    })

    it('rejects invalid mobile number format', () => {
      const result = transporterSchema.safeParse(makeValidTransporter({ mobile_no: '12345' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const mobileErrors = result.error.issues.filter((i) => i.path.includes('mobile_no'))
        expect(mobileErrors.length).toBeGreaterThan(0)
        expect(mobileErrors[0].message).toBe('Please enter a valid phone number')
      }
    })

    it('rejects mobile number with letters', () => {
      const result = transporterSchema.safeParse(makeValidTransporter({ mobile_no: 'abcdefghij' }))
      expect(result.success).toBe(false)
      if (!result.success) {
        const mobileErrors = result.error.issues.filter((i) => i.path.includes('mobile_no'))
        expect(mobileErrors.length).toBeGreaterThan(0)
        expect(mobileErrors[0].message).toBe('Please enter a valid phone number')
      }
    })

    it('accepts a valid 10-digit phone number', () => {
      const result = transporterSchema.safeParse(makeValidTransporter({ mobile_no: '9876543210' }))
      expect(result.success).toBe(true)
    })
  })
})
