import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// Tests — MaintenanceTypeSelect (FCV)
// ═══════════════════════════════════════════════════════════════

const content = readFileSync(
  resolve(process.cwd(), 'src/modules/gate/components/MaintenanceTypeSelect.tsx'),
  'utf-8',
);

describe('MaintenanceTypeSelect', () => {
  // ─── Imports ────────────────────────────────────────────────

  it('imports useState and useMemo from react', () => {
    expect(content).toContain("import { useState, useMemo } from 'react'");
  });

  it('imports useMaintenanceTypes hook', () => {
    expect(content).toContain('useMaintenanceTypes');
  });

  it('imports SearchableSelect from shared components', () => {
    expect(content).toContain("import { SearchableSelect } from '@/shared/components'");
  });

  it('imports MaintenanceType type', () => {
    expect(content).toContain(
      "import type { MaintenanceType } from '../api/maintenance/maintenance.api'",
    );
  });

  // ─── Props Interface ──────────────────────────────────────

  it('defines MaintenanceTypeSelectProps interface', () => {
    expect(content).toContain('interface MaintenanceTypeSelectProps');
  });

  it('accepts onChange callback with typeId and typeName', () => {
    expect(content).toContain('onChange: (typeId: string, typeName: string) => void');
  });

  it('accepts initialDisplayText prop', () => {
    expect(content).toContain('initialDisplayText?: string');
  });

  it('has default placeholder', () => {
    expect(content).toContain("placeholder = 'Select maintenance type'");
  });

  // ─── Active Filtering ─────────────────────────────────────

  it('filters types by is_active', () => {
    expect(content).toContain('types.filter((t) => t.is_active)');
  });

  it('memoizes active types', () => {
    expect(content).toContain('useMemo(');
    expect(content).toContain('[types]');
  });

  it('passes activeTypes to SearchableSelect items', () => {
    expect(content).toContain('items={activeTypes}');
  });

  // ─── Component Structure ──────────────────────────────────

  it('renders SearchableSelect with MaintenanceType generic', () => {
    expect(content).toContain('SearchableSelect<MaintenanceType>');
  });

  it('uses maintenance-type-select as inputId', () => {
    expect(content).toContain('inputId="maintenance-type-select"');
  });

  // ─── Callbacks ────────────────────────────────────────────

  it('calls onChange with type id toString and type_name on item select', () => {
    expect(content).toContain('onChange(type.id.toString(), type.type_name)');
  });

  it('calls onChange with empty strings on clear', () => {
    expect(content).toContain("onChange('', '')");
  });

  it('uses getItemKey with type id', () => {
    expect(content).toContain('getItemKey={(t) => t.id}');
  });

  it('uses getItemLabel with type_name', () => {
    expect(content).toContain('getItemLabel={(t) => t.type_name}');
  });

  // ─── Display Texts ────────────────────────────────────────

  it('shows loading text for maintenance types', () => {
    expect(content).toContain('loadingText="Loading maintenance types..."');
  });

  it('shows empty text when no maintenance types', () => {
    expect(content).toContain('emptyText="No maintenance types available"');
  });

  it('shows not found text when search has no results', () => {
    expect(content).toContain('notFoundText="No maintenance types found"');
  });
});
