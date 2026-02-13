import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// Tests — ContractorSelect (FCV)
// ═══════════════════════════════════════════════════════════════

const content = readFileSync(
  resolve(process.cwd(), 'src/modules/gate/components/ContractorSelect.tsx'),
  'utf-8',
);

describe('ContractorSelect', () => {
  // ─── Imports ────────────────────────────────────────────────

  it('imports useState and useMemo from react', () => {
    expect(content).toContain("import { useState, useMemo } from 'react'");
  });

  it('imports useContractors hook', () => {
    expect(content).toContain('useContractors');
  });

  it('imports SearchableSelect from shared components', () => {
    expect(content).toContain("import { SearchableSelect } from '@/shared/components'");
  });

  it('imports Contractor type', () => {
    expect(content).toContain(
      "import type { Contractor } from '../api/personGateIn/personGateIn.api'",
    );
  });

  // ─── Props Interface ──────────────────────────────────────

  it('defines ContractorSelectProps interface', () => {
    expect(content).toContain('interface ContractorSelectProps');
  });

  it('accepts onChange callback with contractorId (number) and contractorName', () => {
    expect(content).toContain('onChange: (contractorId: number, contractorName: string) => void');
  });

  it('accepts activeOnly prop with default true', () => {
    expect(content).toContain('activeOnly = true');
  });

  it('accepts initialDisplayText prop', () => {
    expect(content).toContain('initialDisplayText?: string');
  });

  // ─── Active Filtering ─────────────────────────────────────

  it('filters contractors by is_active when activeOnly is true', () => {
    expect(content).toContain('activeOnly ? contractors.filter((c) => c.is_active) : contractors');
  });

  it('memoizes filtered contractors', () => {
    expect(content).toContain('useMemo(');
    expect(content).toContain('[contractors, activeOnly]');
  });

  it('passes filteredContractors to SearchableSelect items', () => {
    expect(content).toContain('items={filteredContractors}');
  });

  // ─── Component Structure ──────────────────────────────────

  it('uses isDropdownOpen state for lazy loading', () => {
    expect(content).toContain('const [isDropdownOpen, setIsDropdownOpen] = useState(false)');
  });

  it('renders SearchableSelect with Contractor generic', () => {
    expect(content).toContain('SearchableSelect<Contractor>');
  });

  it('uses contractor-select as inputId', () => {
    expect(content).toContain('inputId="contractor-select"');
  });

  // ─── Callbacks ────────────────────────────────────────────

  it('calls onChange with contractor id and name on item select', () => {
    expect(content).toContain('onChange(contractor.id, contractor.contractor_name)');
  });

  it('calls onChange with 0 and empty string on clear', () => {
    expect(content).toContain("onChange(0, '')");
  });

  it('uses getItemKey with contractor id', () => {
    expect(content).toContain('getItemKey={(c) => c.id}');
  });

  it('uses getItemLabel with contractor_name', () => {
    expect(content).toContain('getItemLabel={(c) => c.contractor_name}');
  });

  // ─── Display Texts ────────────────────────────────────────

  it('shows loading text for contractors', () => {
    expect(content).toContain('loadingText="Loading contractors..."');
  });

  it('shows empty text when no contractors', () => {
    expect(content).toContain('emptyText="No contractors available"');
  });

  it('shows not found text when search has no results', () => {
    expect(content).toContain('notFoundText="No contractors found"');
  });
});
