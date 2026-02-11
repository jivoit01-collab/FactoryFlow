import { describe, it, expect, vi } from 'vitest'

// ═══════════════════════════════════════════════════════════════
// Mock external dependencies
// ═══════════════════════════════════════════════════════════════

vi.mock('@/config/constants', () => ({
  ENTRY_TYPES: {
    RAW_MATERIAL: 'RAW_MATERIAL',
    CONSTRUCTION: 'CONSTRUCTION',
    DAILY_NEED: 'DAILY_NEED',
    MAINTENANCE: 'MAINTENANCE',
  },
}))

// ═══════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════

import {
  RAW_MATERIAL_FLOW,
  CONSTRUCTION_FLOW,
  DAILY_NEED_FLOW,
  MAINTENANCE_FLOW,
} from '../../constants/entryFlowConfig'

// ═══════════════════════════════════════════════════════════════
// Helper: shared shape assertion
// ═══════════════════════════════════════════════════════════════

function expectFlowShape(flow: Record<string, unknown>) {
  expect(flow).toHaveProperty('entryType')
  expect(flow).toHaveProperty('routePrefix')
  expect(flow).toHaveProperty('headerTitle')
  expect(flow).toHaveProperty('totalSteps')
  expect(flow).toHaveProperty('dashboardTitle')
  expect(flow).toHaveProperty('dashboardDescription')
  expect(flow).toHaveProperty('allPageTitle')
  expect(flow).toHaveProperty('allPageDescription')
}

// ═══════════════════════════════════════════════════════════════
// Tests — RAW_MATERIAL_FLOW
// ═══════════════════════════════════════════════════════════════

describe('RAW_MATERIAL_FLOW', () => {
  it('has the correct EntryFlowConfig shape', () => {
    expectFlowShape(RAW_MATERIAL_FLOW)
  })

  it('has entryType = RAW_MATERIAL', () => {
    expect(RAW_MATERIAL_FLOW.entryType).toBe('RAW_MATERIAL')
  })

  it('has routePrefix = /gate/raw-materials', () => {
    expect(RAW_MATERIAL_FLOW.routePrefix).toBe('/gate/raw-materials')
  })

  it('has headerTitle = Material Inward', () => {
    expect(RAW_MATERIAL_FLOW.headerTitle).toBe('Material Inward')
  })

  it('has totalSteps = 5', () => {
    expect(RAW_MATERIAL_FLOW.totalSteps).toBe(5)
  })

  it('has dashboardTitle', () => {
    expect(RAW_MATERIAL_FLOW.dashboardTitle).toBe('Raw Materials (RM/PM/Assets)')
  })

  it('has dashboardDescription', () => {
    expect(RAW_MATERIAL_FLOW.dashboardDescription).toBe(
      'Manage raw materials, packing materials, and assets gate entries',
    )
  })

  it('has allPageTitle', () => {
    expect(RAW_MATERIAL_FLOW.allPageTitle).toBe('Raw Materials (RM/PM/Assets)')
  })

  it('has allPageDescription', () => {
    expect(RAW_MATERIAL_FLOW.allPageDescription).toBe(
      'Manage raw materials, packing materials, and assets gate entries',
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests — CONSTRUCTION_FLOW
// ═══════════════════════════════════════════════════════════════

describe('CONSTRUCTION_FLOW', () => {
  it('has the correct EntryFlowConfig shape', () => {
    expectFlowShape(CONSTRUCTION_FLOW)
  })

  it('has entryType = CONSTRUCTION', () => {
    expect(CONSTRUCTION_FLOW.entryType).toBe('CONSTRUCTION')
  })

  it('has routePrefix = /gate/construction', () => {
    expect(CONSTRUCTION_FLOW.routePrefix).toBe('/gate/construction')
  })

  it('has headerTitle = Construction Entry', () => {
    expect(CONSTRUCTION_FLOW.headerTitle).toBe('Construction Entry')
  })

  it('has totalSteps = 3', () => {
    expect(CONSTRUCTION_FLOW.totalSteps).toBe(3)
  })

  it('has dashboardTitle', () => {
    expect(CONSTRUCTION_FLOW.dashboardTitle).toBe('Construction (Civil/Building Work)')
  })

  it('has dashboardDescription', () => {
    expect(CONSTRUCTION_FLOW.dashboardDescription).toBe(
      'Manage construction materials and building work gate entries',
    )
  })

  it('has allPageTitle', () => {
    expect(CONSTRUCTION_FLOW.allPageTitle).toBe('Construction (Civil/Building Work)')
  })

  it('has allPageDescription', () => {
    expect(CONSTRUCTION_FLOW.allPageDescription).toBe(
      'Manage construction materials and building work gate entries',
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests — DAILY_NEED_FLOW
// ═══════════════════════════════════════════════════════════════

describe('DAILY_NEED_FLOW', () => {
  it('has the correct EntryFlowConfig shape', () => {
    expectFlowShape(DAILY_NEED_FLOW)
  })

  it('has entryType = DAILY_NEED', () => {
    expect(DAILY_NEED_FLOW.entryType).toBe('DAILY_NEED')
  })

  it('has routePrefix = /gate/daily-needs', () => {
    expect(DAILY_NEED_FLOW.routePrefix).toBe('/gate/daily-needs')
  })

  it('has headerTitle = Daily Needs Entry', () => {
    expect(DAILY_NEED_FLOW.headerTitle).toBe('Daily Needs Entry')
  })

  it('has totalSteps = 3', () => {
    expect(DAILY_NEED_FLOW.totalSteps).toBe(3)
  })

  it('has dashboardTitle', () => {
    expect(DAILY_NEED_FLOW.dashboardTitle).toBe('Daily Needs (Food/Consumables)')
  })

  it('has dashboardDescription', () => {
    expect(DAILY_NEED_FLOW.dashboardDescription).toBe(
      'Manage daily needs, food, and consumables gate entries',
    )
  })

  it('has allPageTitle', () => {
    expect(DAILY_NEED_FLOW.allPageTitle).toBe('Daily Needs (Food/Consumables)')
  })

  it('has allPageDescription', () => {
    expect(DAILY_NEED_FLOW.allPageDescription).toBe(
      'Manage daily needs, food, and consumables gate entries',
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// Tests — MAINTENANCE_FLOW
// ═══════════════════════════════════════════════════════════════

describe('MAINTENANCE_FLOW', () => {
  it('has the correct EntryFlowConfig shape', () => {
    expectFlowShape(MAINTENANCE_FLOW)
  })

  it('has entryType = MAINTENANCE', () => {
    expect(MAINTENANCE_FLOW.entryType).toBe('MAINTENANCE')
  })

  it('has routePrefix = /gate/maintenance', () => {
    expect(MAINTENANCE_FLOW.routePrefix).toBe('/gate/maintenance')
  })

  it('has headerTitle = Maintenance Entry', () => {
    expect(MAINTENANCE_FLOW.headerTitle).toBe('Maintenance Entry')
  })

  it('has totalSteps = 3', () => {
    expect(MAINTENANCE_FLOW.totalSteps).toBe(3)
  })

  it('has dashboardTitle', () => {
    expect(MAINTENANCE_FLOW.dashboardTitle).toBe('Maintenance (Spare parts/Tools)')
  })

  it('has dashboardDescription', () => {
    expect(MAINTENANCE_FLOW.dashboardDescription).toBe(
      'Manage maintenance items, spare parts, and tools gate entries',
    )
  })

  it('has allPageTitle', () => {
    expect(MAINTENANCE_FLOW.allPageTitle).toBe('Maintenance (Spare parts/Tools)')
  })

  it('has allPageDescription', () => {
    expect(MAINTENANCE_FLOW.allPageDescription).toBe(
      'Manage maintenance items, spare parts, and tools gate entries',
    )
  })
})
