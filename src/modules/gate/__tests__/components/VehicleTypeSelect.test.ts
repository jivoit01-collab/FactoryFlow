import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// Tests — VehicleTypeSelect (FCV)
// ═══════════════════════════════════════════════════════════════

const content = readFileSync(
  resolve(process.cwd(), 'src/modules/gate/components/VehicleTypeSelect.tsx'),
  'utf-8',
);

describe('VehicleTypeSelect', () => {
  // ─── Imports ────────────────────────────────────────────────

  it('imports useState from react', () => {
    expect(content).toContain("import { useState } from 'react'");
  });

  it('imports useVehicleTypes hook', () => {
    expect(content).toContain('useVehicleTypes');
  });

  it('imports SearchableSelect from shared components', () => {
    expect(content).toContain("import { SearchableSelect } from '@/shared/components'");
  });

  it('imports VehicleType type', () => {
    expect(content).toContain("import type { VehicleType } from '../api/vehicle/vehicle.api'");
  });

  // ─── Props Interface ──────────────────────────────────────

  it('defines VehicleTypeSelectProps interface', () => {
    expect(content).toContain('interface VehicleTypeSelectProps');
  });

  it('accepts onChange callback with typeId (number) and typeName', () => {
    expect(content).toContain('onChange: (typeId: number, typeName: string) => void');
  });

  it('has default placeholder', () => {
    expect(content).toContain("placeholder = 'Select vehicle type'");
  });

  it('does not have initialDisplayText prop', () => {
    expect(content).not.toContain('initialDisplayText');
  });

  // ─── Component Structure ──────────────────────────────────

  it('uses isDropdownOpen state for lazy loading', () => {
    expect(content).toContain('const [isDropdownOpen, setIsDropdownOpen] = useState(false)');
  });

  it('passes isDropdownOpen to useVehicleTypes', () => {
    expect(content).toContain('useVehicleTypes(isDropdownOpen)');
  });

  it('renders SearchableSelect with VehicleType generic', () => {
    expect(content).toContain('SearchableSelect<VehicleType>');
  });

  it('uses vehicle-type-select as inputId', () => {
    expect(content).toContain('inputId="vehicle-type-select"');
  });

  it('passes vehicleTypes directly without filtering', () => {
    expect(content).toContain('items={vehicleTypes}');
  });

  // ─── Callbacks ────────────────────────────────────────────

  it('calls onChange with vehicle type id and name on item select', () => {
    expect(content).toContain('onChange(vt.id, vt.name)');
  });

  it('calls onChange with 0 and empty string on clear', () => {
    expect(content).toContain("onChange(0, '')");
  });

  it('uses getItemKey with vehicle type id', () => {
    expect(content).toContain('getItemKey={(vt) => vt.id}');
  });

  it('uses getItemLabel with vehicle type name', () => {
    expect(content).toContain('getItemLabel={(vt) => vt.name}');
  });

  // ─── Display Texts ────────────────────────────────────────

  it('shows loading text for vehicle types', () => {
    expect(content).toContain('loadingText="Loading vehicle types..."');
  });

  it('shows empty text when no vehicle types', () => {
    expect(content).toContain('emptyText="No vehicle types available"');
  });

  it('shows not found text when search has no results', () => {
    expect(content).toContain('notFoundText="No vehicle types found"');
  });
});
