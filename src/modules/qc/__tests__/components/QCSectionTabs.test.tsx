/**
 * The QC sidebar has one item per area; the pages of an area share a tab bar,
 * and an area's bare path opens the first page the user may see.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QC_PERMISSIONS } from '@/config/permissions';

const granted = vi.hoisted(() => ({ perms: new Set<string>() }));
const counts = vi.hoisted(() => ({ data: undefined as unknown, enabled: [] as boolean[] }));

vi.mock('@/core/auth', () => ({
  usePermission: () => ({
    hasPermission: (p: string) => granted.perms.has(p),
    hasAnyPermission: (ps: readonly string[]) => ps.some((p) => granted.perms.has(p)),
  }),
}));
vi.mock('@/modules/qc/api/inspection/inspection.queries', () => ({
  useInspectionCounts: (_params: unknown, enabled: boolean) => {
    counts.enabled.push(enabled);
    return { data: enabled ? counts.data : undefined };
  },
}));

const { ArrivalSlipTabs, MasterDataTabs, ProductionQCTabs } =
  await import('../../components/qcSections');
const { default: QCSectionRedirect } = await import('../../pages/QCSectionRedirect');
const { QC_HOME_CANDIDATES } = await import('../../constants/qcSections');

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderAt(path: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              {element}
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const { INSPECTION, APPROVAL, MASTER_DATA, LINE_CLEARANCE_QC, DOCUMENT_FILE, PRODUCTION_QC } =
  QC_PERMISSIONS;

beforeEach(() => {
  granted.perms = new Set();
  counts.data = undefined;
  counts.enabled = [];
});

describe('ArrivalSlipTabs', () => {
  it('shows only the tabs the user may open, and marks the current one', () => {
    granted.perms = new Set([INSPECTION.VIEW, APPROVAL.APPROVE_AS_CHEMIST]);
    renderAt('/qc/arrival-slips/approvals', <ArrivalSlipTabs />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Inspections',
      'Approvals',
      'Decision Changes',
    ]);
    expect(screen.getByRole('tab', { name: /Approvals/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('hides the Approvals tab from someone who cannot approve', () => {
    granted.perms = new Set([INSPECTION.VIEW]);
    renderAt('/qc/arrival-slips', <ArrivalSlipTabs />);

    expect(screen.queryByRole('tab', { name: /Approvals/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('moves to the tab’s own route', () => {
    granted.perms = new Set([INSPECTION.VIEW]);
    renderAt('/qc/arrival-slips', <ArrivalSlipTabs />);

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Decision Changes' }));
    expect(screen.getByTestId('where').textContent).toBe('/qc/arrival-slips/decision-changed');
  });

  it('counts only the queues the user signs off', () => {
    granted.perms = new Set([INSPECTION.VIEW, APPROVAL.APPROVE_AS_QAM]);
    counts.data = { awaiting_chemist: 4, awaiting_qam: 2 };
    renderAt('/qc/arrival-slips', <ArrivalSlipTabs />);

    expect(screen.getByRole('tab', { name: /Approvals/ })).toHaveTextContent('Approvals2');
  });

  it('does not ask for counts when the user approves nothing', () => {
    granted.perms = new Set([INSPECTION.VIEW]);
    renderAt('/qc/arrival-slips', <ArrivalSlipTabs />);

    expect(counts.enabled.every((e) => e === false)).toBe(true);
  });
});

describe('ArrivalSlipTabs — the arrival-slip masters', () => {
  it('sit on the arrival-slip bar for whoever keeps them', () => {
    granted.perms = new Set([
      INSPECTION.VIEW,
      MASTER_DATA.MANAGE_MATERIAL_TYPES,
      MASTER_DATA.MANAGE_QC_PARAMETERS,
    ]);
    renderAt('/qc/arrival-slips/parameters', <ArrivalSlipTabs />);

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Inspections',
      'Decision Changes',
      'Material Types',
      'QC Parameters',
    ]);
    expect(screen.getByRole('tab', { name: 'QC Parameters' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('are left off for someone who does not keep them', () => {
    granted.perms = new Set([INSPECTION.VIEW, MASTER_DATA.MANAGE_MATERIAL_TYPES]);
    renderAt('/qc/arrival-slips', <ArrivalSlipTabs />);

    expect(screen.queryByRole('tab', { name: 'QC Parameters' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Material Types' })).toBeInTheDocument();
  });
});

describe('MasterDataTabs', () => {
  it('shows its one tab — Print Documents — even alone', () => {
    granted.perms = new Set([MASTER_DATA.MANAGE_QC_PARAMETERS]);
    renderAt('/qc/master/print-documents', <MasterDataTabs />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Print Documents']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('shows nothing to someone who cannot open it', () => {
    granted.perms = new Set([INSPECTION.VIEW]);
    renderAt('/qc/arrival-slips', <MasterDataTabs />);
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});

describe('ProductionQCTabs', () => {
  it('shows Entries and Parameter Types to someone who fills and manages', () => {
    granted.perms = new Set([PRODUCTION_QC.FILL, PRODUCTION_QC.MANAGE_PARAMETERS]);
    renderAt('/qc/production/parameter-types', <ProductionQCTabs />);

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Entries',
      'Parameter Types',
    ]);
    expect(screen.getByRole('tab', { name: 'Parameter Types' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it.each([[PRODUCTION_QC.VIEW], [PRODUCTION_QC.FILL], [PRODUCTION_QC.APPROVE]])(
    'renders no bar for %s without the masters',
    (perm) => {
      granted.perms = new Set([perm]);
      renderAt('/qc/production', <ProductionQCTabs />);

      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    },
  );
});

describe('QCSectionRedirect from /qc', () => {
  it.each([
    [[INSPECTION.VIEW], '/qc/arrival-slips'],
    [[APPROVAL.APPROVE_AS_CHEMIST], '/qc/arrival-slips/approvals'],
    [[PRODUCTION_QC.VIEW], '/qc/production'],
    [[PRODUCTION_QC.FILL], '/qc/production'],
    [[PRODUCTION_QC.APPROVE, LINE_CLEARANCE_QC.APPROVE], '/qc/production'],
    [[LINE_CLEARANCE_QC.APPROVE], '/qc/line-clearance'],
    [[DOCUMENT_FILE.VIEW], '/qc/qa-procedures'],
    [[PRODUCTION_QC.MANAGE_PARAMETERS], '/qc/production/parameter-types'],
    // Arrival Slips comes first in the sidebar, masters tabs included.
    [
      [PRODUCTION_QC.MANAGE_PARAMETERS, MASTER_DATA.MANAGE_MATERIAL_TYPES],
      '/qc/arrival-slips/material-types',
    ],
    [[MASTER_DATA.MANAGE_QC_PARAMETERS], '/qc/arrival-slips/parameters'],
    [[DOCUMENT_FILE.VIEW_AUDIT], '/qc/qa-procedures/log'],
    [[], '/unauthorized'],
  ])('with %j lands on %s', (perms, expected) => {
    granted.perms = new Set(perms);
    render(
      <MemoryRouter initialEntries={['/qc']}>
        <Routes>
          <Route path="/qc" element={<QCSectionRedirect candidates={QC_HOME_CANDIDATES} />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('where').textContent).toBe(expected);
  });
});
