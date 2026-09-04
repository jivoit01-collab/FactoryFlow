import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MAINTENANCE_PERMISSIONS } from '@/config/permissions';

import MaintenanceMaterialIndentPage from '../pages/MaintenanceMaterialIndentPage';

// The vi.mock factory is hoisted above every top-level const, so the fixtures
// it returns have to be hoisted with it.
const fixtures = vi.hoisted(() => {
  const ITEM = {
    id: 11,
    indent: 5,
    line_num: 1,
    particulars: 'A4 Paper box',
    specification: '',
    quantity: '30.000',
    unit: 'NOS',
    priority: 'NORMAL',
    issued_quantity: '0.000',
    shortfall_quantity: '0.000',
    received_quantity: '0.000',
    received_spare: null,
    received_spare_name: '',
    remarks: '',
    is_active: true,
    created_by: null,
    updated_by: null,
    created_at: '2026-09-01T05:00:00Z',
    updated_at: '2026-09-01T05:00:00Z',
  };

  const DRAFT_INDENT = {
    id: 5,
    company: 1,
    indent_no: 'MI-000005',
    indent_date: '2026-09-01',
    purpose: 'Stationery',
    department: null,
    department_name: '',
    requested_by_name: 'Vikram',
    contact_no: '',
    status: 'DRAFT',
    status_display: 'Draft',
    remarks: '',
    submitted_by: null,
    submitted_by_name: '',
    submitted_at: null,
    reviewed_by: null,
    reviewed_by_name: '',
    reviewed_at: null,
    store_remarks: '',
    approved_by: null,
    approved_by_name: '',
    approved_at: null,
    decision_remarks: '',
    purchased_by: null,
    purchased_by_name: '',
    purchased_at: null,
    purchase_remarks: '',
    gatein_vehicle_number: '',
    gatein_driver_name: '',
    gatein_driver_mobile: '',
    gate_in_by: null,
    gate_in_by_name: '',
    gate_in_at: null,
    received_by: null,
    received_by_name: '',
    received_at: null,
    quotations_submitted_by: null,
    quotations_submitted_by_name: '',
    quotations_submitted_at: null,
    selected_quotation: null,
    selected_company_name: '',
    quotation_selected_by: null,
    quotation_selected_by_name: '',
    quotation_selected_at: null,
    quotation_remarks: '',
    items: [ITEM],
    attachments: [],
    quotations: [],
    total_items: 1,
    has_shortfall: false,
    is_active: true,
    created_by: 1,
    created_by_name: 'Vikram',
    updated_by: 1,
    updated_by_name: 'Vikram',
    created_at: '2026-09-01T05:00:00Z',
    updated_at: '2026-09-01T05:00:00Z',
  };

  const noopMutation = () => ({ mutateAsync: vi.fn(), isPending: false });

  return { DRAFT_INDENT, noopMutation };
});

vi.mock('../api', () => ({
  useMaterialIndents: () => ({
    data: [fixtures.DRAFT_INDENT],
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useMaterialIndent: () => ({ data: fixtures.DRAFT_INDENT, isLoading: false }),
  useMaintenanceOptions: () => ({ data: undefined, isLoading: false }),
  useCreateMaterialIndent: fixtures.noopMutation,
  useSubmitMaterialIndent: fixtures.noopMutation,
  useReviewMaterialIndent: fixtures.noopMutation,
  useApproveMaterialIndent: fixtures.noopMutation,
  useRejectMaterialIndent: fixtures.noopMutation,
  usePurchaseMaterialIndent: fixtures.noopMutation,
  useGateInMaterialIndent: fixtures.noopMutation,
  useReceiveMaterialIndent: fixtures.noopMutation,
  useCancelMaterialIndent: fixtures.noopMutation,
  useDeleteMaterialIndent: fixtures.noopMutation,
  useUploadMaterialIndentAttachment: fixtures.noopMutation,
  useDeleteMaterialIndentAttachment: fixtures.noopMutation,
}));

const granted = vi.hoisted(() => ({ current: new Set<string>() }));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: (permission: string) => granted.current.has(permission),
    hasAnyPermission: (permissions: readonly string[]) =>
      permissions.some((permission) => granted.current.has(permission)),
  }),
}));

/**
 * The permission bundles the Django role groups hand a user — see
 * `maintenance/management/commands/ensure_role_groups.py`. A group is nothing
 * more than this bundle once /auth/me flattens direct + group permissions.
 */
const GROUPS = {
  'Material Indent Draft Only': [
    MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT,
    MAINTENANCE_PERMISSIONS.DRAFT_MATERIAL_INDENT,
  ],
  'Material Indent Sender': [
    MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT,
    MAINTENANCE_PERMISSIONS.SUBMIT_MATERIAL_INDENT,
  ],
  // The role that shipped before the split — one person does both halves.
  'Material Indent Requester': [
    MAINTENANCE_PERMISSIONS.VIEW_MATERIAL_INDENT,
    MAINTENANCE_PERMISSIONS.MANAGE_MATERIAL_INDENT,
  ],
} as const;

function signInAs(group: keyof typeof GROUPS) {
  granted.current = new Set<string>(GROUPS[group]);
}

const newIndentButton = () => screen.getByRole('button', { name: /new indent/i });
const sendForApprovalButton = () => screen.queryByRole('button', { name: /send for approval/i });

async function openTheDraft() {
  fireEvent.click(screen.getByRole('button', { name: /^view$/i }));
  await waitFor(() => expect(screen.getByText('Material Indent MI-000005')).toBeInTheDocument());
}

describe('Material Indent page — draft / send split', () => {
  beforeEach(() => {
    granted.current = new Set<string>();
  });

  it('lets a draft-only user raise an indent but hides Send for Approval', async () => {
    signInAs('Material Indent Draft Only');
    render(
      <MemoryRouter>
        <MaintenanceMaterialIndentPage />
      </MemoryRouter>,
    );

    expect(newIndentButton()).toBeEnabled();
    await openTheDraft();
    expect(sendForApprovalButton()).not.toBeInTheDocument();
  });

  it('gives the sender Send for Approval but no way to raise an indent', async () => {
    signInAs('Material Indent Sender');
    render(
      <MemoryRouter>
        <MaintenanceMaterialIndentPage />
      </MemoryRouter>,
    );

    expect(newIndentButton()).toBeDisabled();
    await openTheDraft();
    expect(sendForApprovalButton()).toBeInTheDocument();
  });

  it('still gives the legacy requester role both halves', async () => {
    signInAs('Material Indent Requester');
    render(
      <MemoryRouter>
        <MaintenanceMaterialIndentPage />
      </MemoryRouter>,
    );

    expect(newIndentButton()).toBeEnabled();
    await openTheDraft();
    expect(sendForApprovalButton()).toBeInTheDocument();
  });
});
