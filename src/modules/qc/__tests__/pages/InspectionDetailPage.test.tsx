import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// InspectionDetailPage — File Content Verification
//
// At 778 lines, this is the largest page in the QC module.
// It handles create, edit, and view modes for inspections.
// ═══════════════════════════════════════════════════════════════

function readSource(): string {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(
    resolve(process.cwd(), 'src/modules/qc/pages/InspectionDetailPage.tsx'),
    'utf-8',
  );
}

// ═══════════════════════════════════════════════════════════════
// Exports & Dependencies
// ═══════════════════════════════════════════════════════════════

describe('InspectionDetailPage — Exports', () => {
  it('default exports InspectionDetailPage function', () => {
    const content = readSource();
    expect(content).toContain('export default function InspectionDetailPage()');
  });

  it('imports from lucide-react', () => {
    const content = readSource();
    expect(content).toContain("from 'lucide-react'");
    expect(content).toContain('FlaskConical');
    expect(content).toContain('Save');
    expect(content).toContain('Send');
    expect(content).toContain('CheckCircle2');
    expect(content).toContain('XCircle');
    expect(content).toContain('Pencil');
  });

  it('imports UI components from @/shared/components/ui', () => {
    const content = readSource();
    expect(content).toContain("from '@/shared/components/ui'");
    expect(content).toContain('Button');
    expect(content).toContain('Card');
    expect(content).toContain('Input');
    expect(content).toContain('Label');
    expect(content).toContain('Textarea');
  });

  it('imports useScrollToError from @/shared/hooks', () => {
    const content = readSource();
    expect(content).toContain("import { useScrollToError } from '@/shared/hooks'");
  });

  it('imports useInspectionPermissions from hooks', () => {
    const content = readSource();
    expect(content).toContain('useInspectionPermissions');
    expect(content).toContain("from '../hooks'");
  });

  it('imports query hooks from api layer', () => {
    const content = readSource();
    expect(content).toContain('useInspectionForSlip');
    expect(content).toContain('useCreateInspection');
    expect(content).toContain('useUpdateParameterResults');
    expect(content).toContain('useSubmitInspection');
    expect(content).toContain('useApproveAsChemist');
    expect(content).toContain('useApproveAsQAM');
    expect(content).toContain('useRejectInspection');
  });

  it('imports useArrivalSlipById', () => {
    const content = readSource();
    expect(content).toContain('useArrivalSlipById');
  });

  it('imports useQCParametersByMaterialType', () => {
    const content = readSource();
    expect(content).toContain('useQCParametersByMaterialType');
  });

  it('imports MaterialTypeSelect component', () => {
    const content = readSource();
    expect(content).toContain("import { MaterialTypeSelect } from '../components'");
  });
});

// ═══════════════════════════════════════════════════════════════
// Routing
// ═══════════════════════════════════════════════════════════════

describe('InspectionDetailPage — Routing', () => {
  it('uses useParams for slipId and inspectionId', () => {
    const content = readSource();
    expect(content).toContain('useParams');
    expect(content).toContain('slipId');
    expect(content).toContain('inspectionId');
  });

  it('detects new inspection mode from URL', () => {
    const content = readSource();
    expect(content).toContain('isNewInspection');
    expect(content).toContain("pathname.includes('/new')");
  });
});

// ═══════════════════════════════════════════════════════════════
// Form
// ═══════════════════════════════════════════════════════════════

describe('InspectionDetailPage — Form', () => {
  it('has form data state with all inspection fields', () => {
    const content = readSource();
    expect(content).toContain('inspection_date');
    expect(content).toContain('description_of_material');
    expect(content).toContain('sap_code');
    expect(content).toContain('supplier_name');
    expect(content).toContain('manufacturer_name');
    expect(content).toContain('vehicle_no');
    expect(content).toContain('material_type_id');
  });

  it('has parameter results state', () => {
    const content = readSource();
    expect(content).toContain('parameterResults');
    expect(content).toContain('setParameterResults');
  });

  it('has approval remarks state', () => {
    const content = readSource();
    expect(content).toContain('approvalRemarks');
    expect(content).toContain('setApprovalRemarks');
  });

  it('has final status state', () => {
    const content = readSource();
    expect(content).toContain('finalStatus');
    expect(content).toContain('setFinalStatus');
  });

  it('has edit mode toggle', () => {
    const content = readSource();
    expect(content).toContain('isEditing');
    expect(content).toContain('setIsEditing');
  });
});

// ═══════════════════════════════════════════════════════════════
// Permissions & Workflow
// ═══════════════════════════════════════════════════════════════

describe('InspectionDetailPage — Permissions', () => {
  it('uses useInspectionPermissions hook', () => {
    const content = readSource();
    expect(content).toContain('useInspectionPermissions');
  });

  it('references WORKFLOW_STATUS constants', () => {
    const content = readSource();
    expect(content).toContain('WORKFLOW_STATUS');
  });

  it('references FINAL_STATUS constants', () => {
    const content = readSource();
    expect(content).toContain('FINAL_STATUS');
  });

  it('imports WORKFLOW_STATUS_CONFIG and FINAL_STATUS_CONFIG for display', () => {
    const content = readSource();
    expect(content).toContain('WORKFLOW_STATUS_CONFIG');
    expect(content).toContain('FINAL_STATUS_CONFIG');
  });
});

// ═══════════════════════════════════════════════════════════════
// Error Handling
// ═══════════════════════════════════════════════════════════════

describe('InspectionDetailPage — Error Handling', () => {
  it('has apiErrors state', () => {
    const content = readSource();
    expect(content).toContain('apiErrors');
    expect(content).toContain('setApiErrors');
  });

  it('uses useScrollToError for error display', () => {
    const content = readSource();
    expect(content).toContain('useScrollToError(apiErrors)');
  });
});
