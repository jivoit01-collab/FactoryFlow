import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReturnableGatePasses } from '../api/returnableGatePass.queries';
import MaintenanceReturnablePage from '../pages/MaintenanceReturnablePage';

vi.mock('../api/returnableGatePass.queries', () => ({
  useReturnableGatePasses: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}));

const mockedList = vi.mocked(useReturnableGatePasses);

/** The filter bar's three selects, in render order. */
const SELECT = { status: 0, type: 1, purpose: 2 } as const;

function renderPage() {
  return render(
    <MemoryRouter>
      <MaintenanceReturnablePage />
    </MemoryRouter>,
  );
}

function lastQuery() {
  return mockedList.mock.calls.at(-1)?.[0];
}

describe('returnable register filters', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockedList.mockClear();
  });

  it('starts on the full register', () => {
    renderPage();
    expect(lastQuery()).toMatchObject({ status: 'ALL', purpose: 'ALL' });
    expect(lastQuery()?.is_returnable).toBeUndefined();
  });

  it('survives leaving the page and coming back', () => {
    const { unmount } = renderPage();

    fireEvent.change(screen.getAllByRole('combobox')[SELECT.type], {
      target: { value: 'NON_RETURNABLE' },
    });
    expect(lastQuery()).toMatchObject({ is_returnable: false });

    // Opening a pass unmounts the list; coming back mounts it fresh.
    unmount();
    renderPage();

    expect(lastQuery()).toMatchObject({ is_returnable: false });
    expect(screen.getAllByRole('combobox')[SELECT.type]).toHaveValue('NON_RETURNABLE');
  });

  it('remembers every control, not just the type', () => {
    const { unmount } = renderPage();

    fireEvent.change(screen.getAllByRole('combobox')[SELECT.status], {
      target: { value: 'PENDING_APPROVAL' },
    });
    fireEvent.change(screen.getAllByRole('combobox')[SELECT.purpose], {
      target: { value: 'REPAIR' },
    });
    fireEvent.click(screen.getByRole('button', { name: /overdue only/i }));

    unmount();
    renderPage();

    expect(lastQuery()).toMatchObject({
      status: 'PENDING_APPROVAL',
      purpose: 'REPAIR',
      overdue: true,
    });
  });

  it('clears back to the full register on demand', () => {
    renderPage();

    fireEvent.change(screen.getAllByRole('combobox')[SELECT.type], {
      target: { value: 'RETURNABLE' },
    });
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(lastQuery()?.is_returnable).toBeUndefined();
    // Cleared for good: the next visit must not resurrect it.
    expect(window.sessionStorage.getItem('maintenance_returnable_filters')).toBeNull();
  });

  it('offers no clear button until something is filtered', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });
});
