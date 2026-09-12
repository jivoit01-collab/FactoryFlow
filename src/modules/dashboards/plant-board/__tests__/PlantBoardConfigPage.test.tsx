import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkforceSetting } from '../types';

/**
 * The settings page's one destructive-looking control, and the guarantee it
 * keeps.
 *
 * A department's BAND is a statement about the factory — it decides which
 * workforce strip its people appear on and therefore what every figure above
 * them means. The six the board was designed around live in server code so that
 * nothing here can re-band or remove one; a department the plant grows is added
 * here and carries its own band. These tests pin that line on the page, because
 * the page is the only way into the table and a delete button on the wrong row
 * is the kind of thing nobody notices until it is pressed.
 */

const {
  mockWorkforce,
  mockSave,
  mockAdd,
  mockRemove,
} = vi.hoisted(() => ({
  mockWorkforce: vi.fn(),
  mockSave: vi.fn(),
  mockAdd: vi.fn(),
  mockRemove: vi.fn(),
}));

vi.mock('../api', () => ({
  // The settings page also carries the floor-area factor now.
  usePlantBoardSpace: () => ({
    data: { sqft_per_pallet: 15, floor_sqft: 38_900, blocks: [], updated_at: null },
    isLoading: false,
  }),
  useSavePlantBoardSpace: () => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
  usePlantBoardWorkforce: mockWorkforce,
  useSavePlantBoardWorkforce: mockSave,
  useAddPlantBoardDepartment: mockAdd,
  useRemovePlantBoardDepartment: mockRemove,
}));

vi.mock('../../logistics-control/api', () => ({
  useWarehouseSettings: () => ({ data: [], isLoading: false }),
  useSaveWarehouseSettings: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false, isError: false, error: null }),
}));

import PlantBoardConfigPage from '../pages/PlantBoardConfigPage';

function dept(over: Partial<WorkforceSetting> = {}): WorkforceSetting {
  return {
    key: 'fg_shifting',
    label: 'Fg Shifting',
    band: 'shifting',
    kind: 'employee',
    is_custom: false,
    employees: 5,
    salary_monthly: 117172,
    updated_at: null,
    ...over,
  };
}

const idle = { mutate: vi.fn(), isPending: false, isSuccess: false, isError: false, error: null };

function renderPage(rows: WorkforceSetting[]) {
  mockWorkforce.mockReturnValue({ data: rows, isLoading: false });
  mockSave.mockReturnValue({ ...idle, mutate: vi.fn() });
  const addMutate = vi.fn();
  const removeMutate = vi.fn();
  mockAdd.mockReturnValue({ ...idle, mutate: addMutate });
  mockRemove.mockReturnValue({ ...idle, mutate: removeMutate });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <PlantBoardConfigPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { ...utils, addMutate, removeMutate };
}

function rowFor(label: string): HTMLElement {
  return screen.getByText(label).closest('tr') as HTMLElement;
}

describe('PlantBoardConfigPage — departments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers no way to remove a department the board was designed around', () => {
    renderPage([dept()]);
    expect(
      within(rowFor('Fg Shifting')).queryByRole('button', { name: /remove/i }),
    ).toBeNull();
  });

  it('offers to remove a department that was added here, and says which it is', () => {
    renderPage([dept(), dept({ key: 'night_loading', label: 'Night Loading', is_custom: true })]);

    const row = rowFor('Night Loading');
    expect(within(row).getByRole('button', { name: /remove night loading/i })).toBeTruthy();
    // Labelled on the page too, so the difference is visible before anyone
    // goes looking for the button that is not there on the other rows.
    expect(row.textContent).toContain('added here');
  });

  it('asks before removing, and passes the key when confirmed', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { removeMutate } = renderPage([
      dept({ key: 'night_loading', label: 'Night Loading', is_custom: true }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: /remove night loading/i }));
    expect(confirm).toHaveBeenCalled();
    expect(removeMutate).toHaveBeenCalledWith('night_loading');
  });

  it('does not remove anything when the confirmation is declined', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { removeMutate } = renderPage([
      dept({ key: 'night_loading', label: 'Night Loading', is_custom: true }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: /remove night loading/i }));
    expect(removeMutate).not.toHaveBeenCalled();
  });

  it('adds a department with the band and kind that were picked', () => {
    const { addMutate } = renderPage([dept()]);

    fireEvent.click(screen.getByRole('button', { name: /add department/i }));
    fireEvent.change(screen.getByLabelText('New department name'), { target: { value: 'Night Loading' } });
    fireEvent.change(screen.getByLabelText('New department band'), { target: { value: 'shifting' } });
    fireEvent.change(screen.getByLabelText('New department kind'), { target: { value: 'labour' } });
    fireEvent.change(screen.getByLabelText('New department employees'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('New department monthly salary'), { target: { value: '90000' } });

    const buttons = screen.getAllByRole('button', { name: /add department/i });
    fireEvent.click(buttons[buttons.length - 1]);

    expect(addMutate).toHaveBeenCalledWith(
      {
        label: 'Night Loading',
        band: 'shifting',
        kind: 'labour',
        employees: 7,
        salary_monthly: 90000,
      },
      expect.anything(),
    );
  });

  it('will not add a department with no name', () => {
    renderPage([dept()]);

    fireEvent.click(screen.getByRole('button', { name: /add department/i }));
    // The confirm button is the last one; with an empty name it is disabled,
    // because a department with no caption is unreadable on the wall it is for.
    const buttons = screen.getAllByRole('button', { name: /add department/i });
    expect((buttons[buttons.length - 1] as HTMLButtonElement).disabled).toBe(true);
  });

  it('a new department starts on a band rather than on nothing', () => {
    renderPage([dept()]);

    fireEvent.click(screen.getByRole('button', { name: /add department/i }));
    // A select opening on nothing invites saving without choosing, and band is
    // the one field with no sensible "unset": a department has to appear on
    // some strip or it appears nowhere.
    expect((screen.getByLabelText('New department band') as HTMLSelectElement).value).toBe(
      'production',
    );
    expect((screen.getByLabelText('New department kind') as HTMLSelectElement).value).toBe(
      'employee',
    );
  });
});
