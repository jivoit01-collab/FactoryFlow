// ═══════════════════════════════════════════════════════════════
// Person Gate In API Tests
// ═══════════════════════════════════════════════════════════════
// Verifies that personGateInApi exports exist and expose the
// expected method names for managing person gate-in operations.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/core/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

import { personGateInApi, PERSON_TYPE_IDS } from '../../../api/personGateIn/personGateIn.api'

// ═══════════════════════════════════════════════════════════════
// Export existence
// ═══════════════════════════════════════════════════════════════

describe('personGateInApi', () => {
  it('is defined as an object', () => {
    expect(personGateInApi).toBeDefined()
    expect(typeof personGateInApi).toBe('object')
  })

  // ═══════════════════════════════════════════════════════════════
  // Person Types methods
  // ═══════════════════════════════════════════════════════════════

  it('has a getPersonTypes method', () => {
    expect(typeof personGateInApi.getPersonTypes).toBe('function')
  })

  it('has a createPersonType method', () => {
    expect(typeof personGateInApi.createPersonType).toBe('function')
  })

  it('has an updatePersonType method', () => {
    expect(typeof personGateInApi.updatePersonType).toBe('function')
  })

  it('has a deletePersonType method', () => {
    expect(typeof personGateInApi.deletePersonType).toBe('function')
  })

  // ═══════════════════════════════════════════════════════════════
  // Gates methods
  // ═══════════════════════════════════════════════════════════════

  it('has a getGates method', () => {
    expect(typeof personGateInApi.getGates).toBe('function')
  })

  it('has a createGate method', () => {
    expect(typeof personGateInApi.createGate).toBe('function')
  })

  it('has an updateGate method', () => {
    expect(typeof personGateInApi.updateGate).toBe('function')
  })

  it('has a deleteGate method', () => {
    expect(typeof personGateInApi.deleteGate).toBe('function')
  })

  // ═══════════════════════════════════════════════════════════════
  // Contractors methods
  // ═══════════════════════════════════════════════════════════════

  it('has a getContractors method', () => {
    expect(typeof personGateInApi.getContractors).toBe('function')
  })

  it('has a createContractor method', () => {
    expect(typeof personGateInApi.createContractor).toBe('function')
  })

  it('has an updateContractor method', () => {
    expect(typeof personGateInApi.updateContractor).toBe('function')
  })

  it('has a deleteContractor method', () => {
    expect(typeof personGateInApi.deleteContractor).toBe('function')
  })

  // ═══════════════════════════════════════════════════════════════
  // Visitors methods
  // ═══════════════════════════════════════════════════════════════

  it('has a getVisitors method', () => {
    expect(typeof personGateInApi.getVisitors).toBe('function')
  })

  it('has a getVisitor method', () => {
    expect(typeof personGateInApi.getVisitor).toBe('function')
  })

  it('has a createVisitor method', () => {
    expect(typeof personGateInApi.createVisitor).toBe('function')
  })

  it('has an updateVisitor method', () => {
    expect(typeof personGateInApi.updateVisitor).toBe('function')
  })

  it('has a deleteVisitor method', () => {
    expect(typeof personGateInApi.deleteVisitor).toBe('function')
  })

  // ═══════════════════════════════════════════════════════════════
  // Labours methods
  // ═══════════════════════════════════════════════════════════════

  it('has a getLabours method', () => {
    expect(typeof personGateInApi.getLabours).toBe('function')
  })

  it('has a getLabour method', () => {
    expect(typeof personGateInApi.getLabour).toBe('function')
  })

  it('has a createLabour method', () => {
    expect(typeof personGateInApi.createLabour).toBe('function')
  })

  it('has an updateLabour method', () => {
    expect(typeof personGateInApi.updateLabour).toBe('function')
  })

  it('has a deleteLabour method', () => {
    expect(typeof personGateInApi.deleteLabour).toBe('function')
  })

  // ═══════════════════════════════════════════════════════════════
  // Entry Logs methods
  // ═══════════════════════════════════════════════════════════════

  it('has a createEntry method', () => {
    expect(typeof personGateInApi.createEntry).toBe('function')
  })

  it('has a getEntry method', () => {
    expect(typeof personGateInApi.getEntry).toBe('function')
  })

  it('has an exitEntry method', () => {
    expect(typeof personGateInApi.exitEntry).toBe('function')
  })

  it('has a cancelEntry method', () => {
    expect(typeof personGateInApi.cancelEntry).toBe('function')
  })

  it('has an updateEntry method', () => {
    expect(typeof personGateInApi.updateEntry).toBe('function')
  })

  it('has a getInsideList method', () => {
    expect(typeof personGateInApi.getInsideList).toBe('function')
  })

  it('has a getAllEntries method', () => {
    expect(typeof personGateInApi.getAllEntries).toBe('function')
  })

  it('has a searchEntries method', () => {
    expect(typeof personGateInApi.searchEntries).toBe('function')
  })

  it('has a getEntryCounts method', () => {
    expect(typeof personGateInApi.getEntryCounts).toBe('function')
  })

  // ═══════════════════════════════════════════════════════════════
  // Dashboard & History methods
  // ═══════════════════════════════════════════════════════════════

  it('has a getDashboard method', () => {
    expect(typeof personGateInApi.getDashboard).toBe('function')
  })

  it('has a getVisitorHistory method', () => {
    expect(typeof personGateInApi.getVisitorHistory).toBe('function')
  })

  it('has a getLabourHistory method', () => {
    expect(typeof personGateInApi.getLabourHistory).toBe('function')
  })

  it('has a checkPersonStatus method', () => {
    expect(typeof personGateInApi.checkPersonStatus).toBe('function')
  })

  // ═══════════════════════════════════════════════════════════════
  // No unexpected methods
  // ═══════════════════════════════════════════════════════════════

  it('exposes exactly the expected methods', () => {
    const methodNames = Object.keys(personGateInApi).sort()
    expect(methodNames).toEqual([
      'cancelEntry',
      'checkPersonStatus',
      'createContractor',
      'createEntry',
      'createGate',
      'createLabour',
      'createPersonType',
      'createVisitor',
      'deleteContractor',
      'deleteGate',
      'deleteLabour',
      'deletePersonType',
      'deleteVisitor',
      'exitEntry',
      'getAllEntries',
      'getContractors',
      'getDashboard',
      'getEntry',
      'getEntryCounts',
      'getGates',
      'getInsideList',
      'getLabour',
      'getLabourHistory',
      'getLabours',
      'getPersonTypes',
      'getVisitor',
      'getVisitorHistory',
      'getVisitors',
      'searchEntries',
      'updateContractor',
      'updateEntry',
      'updateGate',
      'updateLabour',
      'updatePersonType',
      'updateVisitor',
    ])
  })
})

// ═══════════════════════════════════════════════════════════════
// PERSON_TYPE_IDS constant
// ═══════════════════════════════════════════════════════════════

describe('PERSON_TYPE_IDS', () => {
  it('is defined as an object', () => {
    expect(PERSON_TYPE_IDS).toBeDefined()
    expect(typeof PERSON_TYPE_IDS).toBe('object')
  })

  it('has VISITOR set to 1', () => {
    expect(PERSON_TYPE_IDS.VISITOR).toBe(1)
  })

  it('has LABOUR set to 2', () => {
    expect(PERSON_TYPE_IDS.LABOUR).toBe(2)
  })
})
