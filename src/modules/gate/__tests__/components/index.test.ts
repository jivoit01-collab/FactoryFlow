import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ═══════════════════════════════════════════════════════════════
// Tests — components/index.ts barrel re-exports (FCV)
// ═══════════════════════════════════════════════════════════════
// Dynamic import of gate components triggers lucide-react and
// deep dependency chains that hang Vite's module graph resolver.
// File-content verification avoids this entirely.
// ═══════════════════════════════════════════════════════════════

describe('components/index barrel exports', () => {
  const content = readFileSync(
    resolve(process.cwd(), 'src/modules/gate/components/index.ts'),
    'utf-8',
  )

  // ─── Wizard step components ──────────────────────────────────

  it('exports StepHeader', () => {
    expect(content).toContain("export { StepHeader } from './StepHeader'")
  })

  it('exports StepFooter', () => {
    expect(content).toContain("export { StepFooter } from './StepFooter'")
  })

  it('exports StepLoadingSpinner', () => {
    expect(content).toContain("export { StepLoadingSpinner } from './StepLoadingSpinner'")
  })

  it('exports FillDataAlert', () => {
    expect(content).toContain("export { FillDataAlert } from './FillDataAlert'")
  })

  // ─── Form components ────────────────────────────────────────

  it('exports CategorySelect', () => {
    expect(content).toContain("export { CategorySelect } from './CategorySelect'")
  })

  it('exports DateRangePicker', () => {
    expect(content).toContain("export { DateRangePicker } from './DateRangePicker'")
  })

  it('exports DepartmentSelect', () => {
    expect(content).toContain("export { DepartmentSelect } from './DepartmentSelect'")
  })

  it('exports DriverSelect', () => {
    expect(content).toContain("export { DriverSelect } from './DriverSelect'")
  })

  it('exports TransporterSelect', () => {
    expect(content).toContain("export { TransporterSelect } from './TransporterSelect'")
  })

  it('exports VehicleSelect', () => {
    expect(content).toContain("export { VehicleSelect } from './VehicleSelect'")
  })

  it('exports VendorSelect', () => {
    expect(content).toContain("export { VendorSelect } from './VendorSelect'")
  })

  // ─── Dialog components ──────────────────────────────────────

  it('exports CreateDriverDialog', () => {
    expect(content).toContain("export { CreateDriverDialog } from './CreateDriverDialog'")
  })

  it('exports CreateTransporterDialog', () => {
    expect(content).toContain("export { CreateTransporterDialog } from './CreateTransporterDialog'")
  })

  it('exports CreateVehicleDialog', () => {
    expect(content).toContain("export { CreateVehicleDialog } from './CreateVehicleDialog'")
  })

  // ─── Reusable form shells ───────────────────────────────────

  it('exports VehicleDriverFormShell', () => {
    expect(content).toContain('VehicleDriverFormShell')
  })

  it('exports SecurityCheckFormShell', () => {
    expect(content).toContain('SecurityCheckFormShell')
  })
})
