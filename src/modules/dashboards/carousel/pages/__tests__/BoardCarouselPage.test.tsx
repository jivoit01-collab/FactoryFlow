import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_BOARD_VIEW_PERMISSIONS } from '../../../admin-control/constants';
import { LOGISTICS_CONTROL_VIEW_PERMISSIONS } from '../../../logistics-control/constants';
import { PLANT_BOARD_VIEW_PERMISSIONS } from '../../../plant-board/constants';
import { DEFAULT_DWELL_SECONDS } from '../../constants';

/*
 * The three boards are stubbed.
 *
 * Not to make the test fast — to make it a test of the carousel. Mounting the
 * real Admin board here would pull in its feed, its tank farm and its alert
 * centre, and a failure would then say "the carousel is broken" when what broke
 * was a tile on somebody else's board.
 */
vi.mock('@/modules/dashboards/admin-control/pages/AdminControlDashboardPage', () => ({
  default: () => <div>admin board</div>,
}));
vi.mock('@/modules/dashboards/plant-board/pages/PlantBoardDashboardPage', () => ({
  default: () => <div>plant board</div>,
}));
vi.mock('@/modules/dashboards/logistics-control/pages/LogisticsControlDashboardPage', () => ({
  default: () => <div>logistics board</div>,
}));

const held = vi.hoisted(() => ({ permissions: [] as string[], fullscreen: false }));

vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({
    hasAnyPermission: (required: readonly string[]) =>
      required.some((permission) => held.permissions.includes(permission)),
  }),
}));

// Fullscreen is a browser grant jsdom does not make, so the state is faked —
// what matters below is what the page does with it, not that it was granted.
vi.mock('@/modules/dashboards/dispatch/hooks', () => ({
  useFullscreen: () => ({ isFullscreen: held.fullscreen, toggle: vi.fn() }),
}));

const { default: BoardCarouselPage } = await import('../BoardCarouselPage');

/**
 * Push both clocks on together, inside `act`.
 *
 * The rotation timer and the strip's idle timer both fire on their own; without
 * the wrapper React reports every one of those as an unacted update, which
 * buries a real failure in a page of warnings.
 */
async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function renderCarousel(permissions: string[]) {
  held.permissions = permissions;
  return render(
    <MemoryRouter>
      <BoardCarouselPage />
    </MemoryRouter>,
  );
}

describe('BoardCarouselPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    held.fullscreen = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on the Admin board', async () => {
    renderCarousel([...ADMIN_BOARD_VIEW_PERMISSIONS]);

    expect(await screen.findByText('admin board')).toBeInTheDocument();
  });

  it('moves to the next board when the dwell is up', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderCarousel([
      ...ADMIN_BOARD_VIEW_PERMISSIONS,
      ...PLANT_BOARD_VIEW_PERMISSIONS,
      ...LOGISTICS_CONTROL_VIEW_PERMISSIONS,
    ]);

    expect(await screen.findByText('admin board')).toBeInTheDocument();

    await tick(DEFAULT_DWELL_SECONDS * 1000 + 500);

    await waitFor(() => expect(screen.getByText('plant board')).toBeInTheDocument());
    // One board at a time, by design — see the page for why all three are not
    // mounted and toggled.
    expect(screen.queryByText('admin board')).not.toBeInTheDocument();
  });

  /*
   * The carousel mounts the board components directly, which bypasses the route
   * guards they normally sit behind. That is the point — a display login has no
   * route to them — and it is exactly why the gate has to be re-applied here.
   */
  it('leaves out a board the viewer may not read', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // A login holding only the factory expense right: enough for Admin, and for
    // the Logistics board's workforce card, but not for Plant.
    renderCarousel(['factory_expense.can_view_factory_expense']);

    expect(await screen.findByText('admin board')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Plant Control/ })).not.toBeInTheDocument();

    await tick(DEFAULT_DWELL_SECONDS * 1000 + 500);

    await waitFor(() => expect(screen.getByText('logistics board')).toBeInTheDocument());
  });

  /*
   * The regression this pins: the browser promotes the CAROUSEL SHELL, not the
   * board inside it, so each board's own `:fullscreen` rules never match and it
   * keeps the relaxed, growing layout meant for a scrolling shell. On the plant
   * board that put a fourth band's worth of height into one screen and clipped
   * the Shifting band off the bottom. `ops-wall` is how the board's stylesheet
   * is told it is on a wall regardless; out of fullscreen it must be absent,
   * because there the relaxed layout is the correct one.
   */
  it('tells the board it is on a wall only while fullscreen', async () => {
    const { container, unmount } = renderCarousel([...ADMIN_BOARD_VIEW_PERMISSIONS]);
    await screen.findByText('admin board');
    expect(container.querySelector('.bcx')).not.toHaveClass('ops-wall');
    unmount();

    held.fullscreen = true;
    const wall = renderCarousel([...ADMIN_BOARD_VIEW_PERMISSIONS]);
    await screen.findByText('admin board');
    expect(wall.container.querySelector('.bcx')).toHaveClass('ops-wall');
  });

  it('says so rather than showing a blank wall when no board is readable', () => {
    renderCarousel([]);

    expect(screen.getByText('No boards to show')).toBeInTheDocument();
  });

  it('names every board in the rotation so a reader knows what is coming', async () => {
    renderCarousel([
      ...ADMIN_BOARD_VIEW_PERMISSIONS,
      ...PLANT_BOARD_VIEW_PERMISSIONS,
      ...LOGISTICS_CONTROL_VIEW_PERMISSIONS,
    ]);

    await screen.findByText('admin board');
    expect(screen.getByRole('tab', { name: /Admin Control/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /Plant Control/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Logistics Control/ })).toBeInTheDocument();
  });
});
