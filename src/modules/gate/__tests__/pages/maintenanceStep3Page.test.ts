import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — Maintenance Step3Page (FCV)
// ═══════════════════════════════════════════════════════════════
// Tests verify integration with reusable select components
// (MaintenanceTypeSelect, UnitSelect, DepartmentSelect).
// ═══════════════════════════════════════════════════════════════

const content = readFileSync(
  resolve(process.cwd(), 'src/modules/gate/pages/maintenancepages/Step3Page.tsx'),
  'utf-8',
)

describe('Maintenance Step3Page', () => {
  // ─── Select Component Imports ─────────────────────────────

  it('imports MaintenanceTypeSelect from components', () => {
    expect(content).toContain('MaintenanceTypeSelect')
  })

  it('imports UnitSelect from components', () => {
    expect(content).toContain('UnitSelect')
  })

  it('imports DepartmentSelect from components', () => {
    expect(content).toContain('DepartmentSelect')
  })

  it('imports StepHeader and StepFooter from components', () => {
    expect(content).toContain('StepHeader')
    expect(content).toContain('StepFooter')
  })

  it('imports selects from ../../components barrel', () => {
    expect(content).toContain("from '../../components'")
  })

  // ─── MaintenanceTypeSelect Usage ──────────────────────────

  it('renders MaintenanceTypeSelect with value from formData', () => {
    expect(content).toContain('value={formData.maintenanceType || undefined}')
  })

  it('passes onChange to MaintenanceTypeSelect for type and name', () => {
    expect(content).toContain("handleInputChange('maintenanceType', typeId)")
    expect(content).toContain('prev, maintenanceTypeName: typeName')
  })

  it('passes initialDisplayText to MaintenanceTypeSelect', () => {
    expect(content).toContain('initialDisplayText={formData.maintenanceTypeName || undefined}')
  })

  it('passes error prop from apiErrors for maintenanceType', () => {
    expect(content).toContain('error={apiErrors.maintenanceType}')
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

  it('renders DepartmentSelect for receiving department', () => {
    expect(content).toContain('<DepartmentSelect')
  })

  it('passes onChange to DepartmentSelect converting to string', () => {
    expect(content).toContain("handleInputChange('receivingDepartment', departmentId.toString())")
  })

  it('passes initialDisplayText to DepartmentSelect from formData', () => {
    expect(content).toContain('initialDisplayText={formData.receivingDepartmentName || undefined}')
  })

  // ─── Form Data Structure ──────────────────────────────────

  it('defines FormData with maintenanceType and name fields', () => {
    expect(content).toContain('interface FormData')
    expect(content).toContain('maintenanceType: string')
    expect(content).toContain('maintenanceTypeName: string')
  })

  it('includes unitName for display text', () => {
    expect(content).toContain('unitName: string')
  })

  it('includes receivingDepartmentName for display text', () => {
    expect(content).toContain('receivingDepartmentName: string')
  })

  // ─── Validation ───────────────────────────────────────────

  it('validates maintenanceType is selected', () => {
    expect(content).toContain('!formData.maintenanceType')
    expect(content).toContain("'Please select maintenance type'")
  })

  it('validates unit is selected', () => {
    expect(content).toContain('!formData.unit')
    expect(content).toContain("'Please select unit'")
  })

  it('validates receivingDepartment is selected', () => {
    expect(content).toContain('!formData.receivingDepartment')
    expect(content).toContain("'Please select receiving department'")
  })

  // ─── API Request Mapping ──────────────────────────────────

  it('maps maintenanceType to maintenance_type as integer', () => {
    expect(content).toContain('maintenance_type: parseInt(formData.maintenanceType)')
  })

  it('maps unit to integer', () => {
    expect(content).toContain('unit: parseInt(formData.unit)')
  })

  it('maps receivingDepartment to receiving_department as integer', () => {
    expect(content).toContain('receiving_department: parseInt(formData.receivingDepartment)')
  })

  // ─── Uses StepHeader and StepFooter ───────────────────────

  it('renders StepHeader with currentStep and totalSteps', () => {
    expect(content).toContain('<StepHeader')
    expect(content).toContain('currentStep={currentStep}')
    expect(content).toContain('totalSteps={totalSteps}')
  })

  it('renders StepFooter with action handlers', () => {
    expect(content).toContain('<StepFooter')
    expect(content).toContain('onPrevious={handlePrevious}')
    expect(content).toContain('onCancel={handleCancel}')
    expect(content).toContain('onNext={handleNext}')
  })
})
