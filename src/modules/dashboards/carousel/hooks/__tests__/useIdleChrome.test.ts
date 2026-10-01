import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CHROME_IDLE_MS, CHROME_REVEAL_PX } from '../../constants';
import { useIdleChrome } from '../useIdleChrome';

/** A strip row from the top of the screen down to 60px. */
function row(): { current: HTMLDivElement } {
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({ top: 0, bottom: 60, left: 0, right: 1920, width: 1920, height: 60 }) as DOMRect;
  document.body.appendChild(element);
  return { current: element };
}

function pointer(clientY: number, type = 'pointermove') {
  act(() => {
    window.dispatchEvent(new MouseEvent(type, { clientY }));
  });
}

describe('useIdleChrome', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Opened, then left to fade, so each test starts from a hidden strip. */
  function hiddenStrip() {
    const hook = renderHook(() => useIdleChrome(row()));
    act(() => {
      vi.advanceTimersByTime(CHROME_IDLE_MS + 10);
    });
    expect(hook.result.current.visible).toBe(false);
    return hook;
  }

  it('stays hidden for movement anywhere below the very top', () => {
    const { result } = hiddenStrip();

    pointer(CHROME_REVEAL_PX + 30);
    pointer(400);
    pointer(400, 'pointerdown');

    expect(result.current.visible).toBe(false);
  });

  it('shows when the pointer reaches the very top', () => {
    const { result } = hiddenStrip();

    pointer(CHROME_REVEAL_PX - 4);

    expect(result.current.visible).toBe(true);
  });

  it('stays up while the pointer is over it, and goes once it moves down onto the board', () => {
    const { result } = hiddenStrip();
    pointer(4);

    pointer(50);
    act(() => {
      vi.advanceTimersByTime(CHROME_IDLE_MS * 3);
    });
    expect(result.current.visible).toBe(true);

    pointer(200);
    expect(result.current.visible).toBe(false);
  });

  it('is not brought back by a key press', () => {
    const { result } = hiddenStrip();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });

    expect(result.current.visible).toBe(false);
  });
});
