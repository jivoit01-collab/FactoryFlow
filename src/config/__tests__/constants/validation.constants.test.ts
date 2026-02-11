import { describe, it, expect } from 'vitest'
import {
  VALIDATION_PATTERNS,
  VALIDATION_LIMITS,
  VALIDATION_MESSAGES,
} from '@/config/constants/validation.constants'

// ═══════════════════════════════════════════════════════════════
// VALIDATION_PATTERNS
// ═══════════════════════════════════════════════════════════════

describe('VALIDATION_PATTERNS', () => {
  // ─── email ───
  it('email pattern matches valid emails', () => {
    expect(VALIDATION_PATTERNS.email.test('user@example.com')).toBe(true)
    expect(VALIDATION_PATTERNS.email.test('test.name@domain.co.in')).toBe(true)
  })

  it('email pattern rejects invalid emails', () => {
    expect(VALIDATION_PATTERNS.email.test('invalid')).toBe(false)
    expect(VALIDATION_PATTERNS.email.test('@domain.com')).toBe(false)
    expect(VALIDATION_PATTERNS.email.test('user@')).toBe(false)
  })

  // ─── phone ───
  it('phone pattern matches valid phone numbers', () => {
    expect(VALIDATION_PATTERNS.phone.test('1234567890')).toBe(true)
    expect(VALIDATION_PATTERNS.phone.test('+1234567890')).toBe(true)
    expect(VALIDATION_PATTERNS.phone.test('(123)456-7890')).toBe(true)
  })

  it('phone pattern rejects invalid phone numbers', () => {
    expect(VALIDATION_PATTERNS.phone.test('abc')).toBe(false)
    expect(VALIDATION_PATTERNS.phone.test('12345')).toBe(false)
  })

  // ─── vehicleNumber ───
  it('vehicleNumber pattern matches valid Indian vehicle numbers', () => {
    expect(VALIDATION_PATTERNS.vehicleNumber.test('MH12AB1234')).toBe(true)
    expect(VALIDATION_PATTERNS.vehicleNumber.test('KA01A1234')).toBe(true)
  })

  it('vehicleNumber pattern rejects invalid vehicle numbers', () => {
    expect(VALIDATION_PATTERNS.vehicleNumber.test('mh12ab1234')).toBe(false)
    expect(VALIDATION_PATTERNS.vehicleNumber.test('INVALID')).toBe(false)
    expect(VALIDATION_PATTERNS.vehicleNumber.test('12AB1234')).toBe(false)
  })

  // ─── alphanumeric ───
  it('alphanumeric pattern matches "abc123"', () => {
    expect(VALIDATION_PATTERNS.alphanumeric.test('abc123')).toBe(true)
    expect(VALIDATION_PATTERNS.alphanumeric.test('ABC')).toBe(true)
  })

  it('alphanumeric pattern rejects strings with special characters', () => {
    expect(VALIDATION_PATTERNS.alphanumeric.test('abc-123')).toBe(false)
    expect(VALIDATION_PATTERNS.alphanumeric.test('hello world')).toBe(false)
  })

  // ─── numeric ───
  it('numeric pattern matches "12345"', () => {
    expect(VALIDATION_PATTERNS.numeric.test('12345')).toBe(true)
    expect(VALIDATION_PATTERNS.numeric.test('0')).toBe(true)
  })

  it('numeric pattern rejects "123abc"', () => {
    expect(VALIDATION_PATTERNS.numeric.test('123abc')).toBe(false)
    expect(VALIDATION_PATTERNS.numeric.test('-1')).toBe(false)
  })

  // ─── aadhar ───
  it('aadhar pattern matches 12-digit numbers', () => {
    expect(VALIDATION_PATTERNS.aadhar.test('123456789012')).toBe(true)
  })

  it('aadhar pattern rejects 11-digit numbers', () => {
    expect(VALIDATION_PATTERNS.aadhar.test('12345678901')).toBe(false)
  })

  it('aadhar pattern rejects numbers with letters', () => {
    expect(VALIDATION_PATTERNS.aadhar.test('12345678901A')).toBe(false)
  })

  // ─── panCard ───
  it('panCard pattern matches valid PAN (e.g., ABCDE1234F)', () => {
    expect(VALIDATION_PATTERNS.panCard.test('ABCDE1234F')).toBe(true)
  })

  it('panCard pattern rejects invalid PAN formats', () => {
    expect(VALIDATION_PATTERNS.panCard.test('abcde1234f')).toBe(false)
    expect(VALIDATION_PATTERNS.panCard.test('12345ABCDE')).toBe(false)
    expect(VALIDATION_PATTERNS.panCard.test('ABCDE1234')).toBe(false)
  })

  // ─── voterId ───
  it('voterId pattern matches valid voter IDs (e.g., ABC1234567)', () => {
    expect(VALIDATION_PATTERNS.voterId.test('ABC1234567')).toBe(true)
  })

  it('voterId pattern rejects invalid voter IDs', () => {
    expect(VALIDATION_PATTERNS.voterId.test('AB1234567')).toBe(false)
    expect(VALIDATION_PATTERNS.voterId.test('ABCD1234567')).toBe(false)
  })

  // ─── drivingLicense ───
  it('drivingLicense pattern matches valid format (e.g., MH0220150001234)', () => {
    expect(VALIDATION_PATTERNS.drivingLicense.test('MH0220150001234')).toBe(true)
  })

  it('drivingLicense pattern rejects invalid formats', () => {
    expect(VALIDATION_PATTERNS.drivingLicense.test('MH02')).toBe(false)
    expect(VALIDATION_PATTERNS.drivingLicense.test('12345678901234')).toBe(false)
  })

  // ─── All patterns are RegExp ───
  it('all patterns are RegExp instances', () => {
    for (const [, pattern] of Object.entries(VALIDATION_PATTERNS)) {
      expect(pattern).toBeInstanceOf(RegExp)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// VALIDATION_LIMITS
// ═══════════════════════════════════════════════════════════════

describe('VALIDATION_LIMITS', () => {
  it('has name, email, password, description, vehicleNumber, phone keys', () => {
    expect(VALIDATION_LIMITS).toHaveProperty('name')
    expect(VALIDATION_LIMITS).toHaveProperty('email')
    expect(VALIDATION_LIMITS).toHaveProperty('password')
    expect(VALIDATION_LIMITS).toHaveProperty('description')
    expect(VALIDATION_LIMITS).toHaveProperty('vehicleNumber')
    expect(VALIDATION_LIMITS).toHaveProperty('phone')
  })

  it('all min values are non-negative', () => {
    for (const [, limit] of Object.entries(VALIDATION_LIMITS)) {
      expect(limit.min).toBeGreaterThanOrEqual(0)
    }
  })

  it('all max values are greater than min values', () => {
    for (const [, limit] of Object.entries(VALIDATION_LIMITS)) {
      expect(limit.max).toBeGreaterThan(limit.min)
    }
  })

  it('name min is 2, max is 100', () => {
    expect(VALIDATION_LIMITS.name.min).toBe(2)
    expect(VALIDATION_LIMITS.name.max).toBe(100)
  })

  it('email min is 5, max is 255', () => {
    expect(VALIDATION_LIMITS.email.min).toBe(5)
    expect(VALIDATION_LIMITS.email.max).toBe(255)
  })

  it('password min is 8, max is 128', () => {
    expect(VALIDATION_LIMITS.password.min).toBe(8)
    expect(VALIDATION_LIMITS.password.max).toBe(128)
  })

  it('description min is 0, max is 500', () => {
    expect(VALIDATION_LIMITS.description.min).toBe(0)
    expect(VALIDATION_LIMITS.description.max).toBe(500)
  })

  it('vehicleNumber min is 6, max is 15', () => {
    expect(VALIDATION_LIMITS.vehicleNumber.min).toBe(6)
    expect(VALIDATION_LIMITS.vehicleNumber.max).toBe(15)
  })

  it('phone min is 10, max is 15', () => {
    expect(VALIDATION_LIMITS.phone.min).toBe(10)
    expect(VALIDATION_LIMITS.phone.max).toBe(15)
  })
})

// ═══════════════════════════════════════════════════════════════
// VALIDATION_MESSAGES
// ═══════════════════════════════════════════════════════════════

describe('VALIDATION_MESSAGES', () => {
  // ─── Functions ───
  it('required() returns "X is required" for field X', () => {
    expect(VALIDATION_MESSAGES.required('Name')).toBe('Name is required')
    expect(VALIDATION_MESSAGES.required('Email')).toBe('Email is required')
  })

  it('minLength() returns formatted min length message', () => {
    const msg = VALIDATION_MESSAGES.minLength('Name', 2)
    expect(msg).toContain('Name')
    expect(msg).toContain('2')
    expect(msg).toContain('at least')
  })

  it('maxLength() returns formatted max length message', () => {
    const msg = VALIDATION_MESSAGES.maxLength('Name', 100)
    expect(msg).toContain('Name')
    expect(msg).toContain('100')
    expect(msg).toContain('at most')
  })

  // ─── Static strings ───
  it('invalidEmail is a non-empty string', () => {
    expect(typeof VALIDATION_MESSAGES.invalidEmail).toBe('string')
    expect(VALIDATION_MESSAGES.invalidEmail.length).toBeGreaterThan(0)
  })

  it('invalidPhone is a non-empty string', () => {
    expect(typeof VALIDATION_MESSAGES.invalidPhone).toBe('string')
    expect(VALIDATION_MESSAGES.invalidPhone.length).toBeGreaterThan(0)
  })

  it('invalidVehicleNumber contains example format', () => {
    expect(VALIDATION_MESSAGES.invalidVehicleNumber).toContain('MH12AB1234')
  })
})
