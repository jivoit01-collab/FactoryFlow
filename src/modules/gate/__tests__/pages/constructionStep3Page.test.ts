import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════
// Tests — Construction Step3Page (FCV)
// ═══════════════════════════════════════════════════════════════
// Step3Page imports lucide-react and deep hook chains.
// Tests verify integration with new reusable select components.
// ═══════════════════════════════════════════════════════════════

const content = readFileSync(
  resolve(process.cwd(), 'src/modules/gate/pages/constructionpages/Step3Page.tsx'),
  'utf-8',
);

describe('Construction Step3Page', () => {
  // ─── Select Component Imports ─────────────────────────────

  it('imports ConstructionCategorySelect from components', () => {
    expect(content).toContain('ConstructionCategorySelect');
  });

  it('imports UnitSelect from components', () => {
    expect(content).toContain('UnitSelect');
  });

  it('imports both selects from ../../components barrel', () => {
    expect(content).toContain("ConstructionCategorySelect, UnitSelect } from '../../components'");
  });

  // ─── ConstructionCategorySelect Usage ─────────────────────

  it('renders ConstructionCategorySelect with value from formData', () => {
    expect(content).toContain('value={formData.materialCategory || undefined}');
  });

  it('passes onChange to ConstructionCategorySelect for materialCategory', () => {
    expect(content).toContain("handleInputChange('materialCategory', categoryId)");
  });

  it('passes disabled prop to ConstructionCategorySelect', () => {
    expect(content).toContain('<ConstructionCategorySelect');
    expect(content).toMatch(/ConstructionCategorySelect[\s\S]*?disabled={isReadOnly}/);
  });

  it('passes error prop from apiErrors', () => {
    expect(content).toContain('error={apiErrors.materialCategory}');
  });

  it('marks ConstructionCategorySelect as required', () => {
    expect(content).toMatch(/ConstructionCategorySelect[\s\S]*?required/);
  });

  // ─── UnitSelect Usage ─────────────────────────────────────

  it('renders UnitSelect with value from formData', () => {
    expect(content).toContain('value={formData.unit || undefined}');
  });

  it('passes onChange to UnitSelect for both unit and unitName', () => {
    expect(content).toContain("handleInputChange('unit', unitId)");
    expect(content).toContain('prev, unitName');
  });

  it('passes initialDisplayText to UnitSelect', () => {
    expect(content).toContain('initialDisplayText={formData.unitName || undefined}');
  });

  it('passes error prop from apiErrors for unit', () => {
    expect(content).toContain('error={apiErrors.unit}');
  });

  it('marks UnitSelect as required', () => {
    expect(content).toMatch(/UnitSelect[\s\S]*?required/);
  });

  // ─── Form Data Structure ──────────────────────────────────

  it('defines ConstructionFormData interface with unitName field', () => {
    expect(content).toContain('interface ConstructionFormData');
    expect(content).toContain('unitName: string');
  });

  it('includes materialCategory in form data', () => {
    expect(content).toContain('materialCategory: string');
  });

  it('includes unit in form data', () => {
    expect(content).toContain("unit: ''");
  });

  // ─── Validation ───────────────────────────────────────────

  it('validates materialCategory is selected', () => {
    expect(content).toContain('!formData.materialCategory');
    expect(content).toContain("'Please select material category'");
  });

  it('validates unit is selected', () => {
    expect(content).toContain('!formData.unit');
    expect(content).toContain("'Please select unit'");
  });

  // ─── API Request Mapping ──────────────────────────────────

  it('maps materialCategory to material_category as integer', () => {
    expect(content).toContain('material_category: parseInt(formData.materialCategory, 10)');
  });

  it('maps unit to integer', () => {
    expect(content).toContain('unit: parseInt(formData.unit)');
  });
});
