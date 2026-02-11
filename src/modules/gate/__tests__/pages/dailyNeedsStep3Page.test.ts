import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — Daily Needs Step3Page (FCV)
// ═══════════════════════════════════════════════════════════════
// Tests verify integration with reusable select components
// (CategorySelect, DepartmentSelect, UnitSelect).
// ═══════════════════════════════════════════════════════════════

const content = readFileSync(
  resolve(process.cwd(), 'src/modules/gate/pages/dailyneedspages/Step3Page.tsx'),
  'utf-8',
)

describe('Daily Needs Step3Page', () => {
  // ─── Select Component Imports ─────────────────────────────

  it('imports CategorySelect from components', () => {
    expect(content).toContain('CategorySelect')
  })

  it('imports DepartmentSelect from components', () => {
    expect(content).toContain('DepartmentSelect')
  })

  it('imports UnitSelect from components', () => {
    expect(content).toContain('UnitSelect')
  })

  it('imports selects from ../../components barrel', () => {
    expect(content).toContain("from '../../components'")
    expect(content).toContain('CategorySelect')
    expect(content).toContain('DepartmentSelect')
    expect(content).toContain('UnitSelect')
  })

  // ─── CategorySelect Usage ─────────────────────────────────

  it('renders CategorySelect with value from formData.itemCategory', () => {
    expect(content).toContain('value={formData.itemCategory}')
  })

  it('passes onChange to CategorySelect for itemCategory', () => {
    expect(content).toContain("handleInputChange('itemCategory', categoryId)")
  })

  it('passes initialDisplayText from dailyNeedData', () => {
    expect(content).toContain('initialDisplayText={dailyNeedData?.item_category?.category_name}')
  })

  // ─── UnitSelect Usage ─────────────────────────────────────

  it('renders UnitSelect with value from formData.unit', () => {
    expect(content).toContain('value={formData.unit || undefined}')
  })

  it('passes onChange to UnitSelect updating unit and unitName', () => {
    expect(content).toContain("handleInputChange('unit', unitId)")
    expect(content).toContain('prev, unitName')
  })

  it('passes initialDisplayText to UnitSelect from formData.unitName', () => {
    expect(content).toContain('initialDisplayText={formData.unitName || undefined}')
  })

  // ─── DepartmentSelect Usage ───────────────────────────────

  it('renders DepartmentSelect with value from formData.receivingDepartment', () => {
    expect(content).toContain('value={formData.receivingDepartment}')
  })

  it('passes onChange to DepartmentSelect for receivingDepartment', () => {
    expect(content).toContain("handleInputChange('receivingDepartment', departmentId)")
  })

  it('passes initialDisplayText from dailyNeedData receiving_department', () => {
    expect(content).toContain('initialDisplayText={dailyNeedData?.receiving_department?.name}')
  })

  // ─── Form Data Structure ──────────────────────────────────

  it('defines DailyNeedsFormData with unitName field', () => {
    expect(content).toContain('interface DailyNeedsFormData')
    expect(content).toContain('unitName: string')
  })

  it('includes itemCategory in form data', () => {
    expect(content).toContain("itemCategory: number | ''")
  })

  it('includes receivingDepartment in form data', () => {
    expect(content).toContain("receivingDepartment: number | ''")
  })

  // ─── Validation ───────────────────────────────────────────

  it('validates itemCategory is selected', () => {
    expect(content).toContain('!formData.itemCategory')
    expect(content).toContain("'Please select an item category'")
  })

  it('validates unit is selected', () => {
    expect(content).toContain('!formData.unit')
    expect(content).toContain("'Please select unit'")
  })

  it('validates receivingDepartment is selected', () => {
    expect(content).toContain('!formData.receivingDepartment')
    expect(content).toContain("'Please select receiving department'")
  })
})
