import { useEffect } from 'react';

/**
 * Let a wall board fill the shell instead of the shell's centred column.
 *
 * `MainLayout` wraps every page in `container mx-auto p-6`, which caps the
 * content at the breakpoint's max width and centres what is left. That is right
 * for a form or a table — a line of text 1900px wide is unreadable — and wrong
 * for a board designed as one viewport with nothing below the fold: the cards
 * were being squeezed into roughly four fifths of the screen while the rest sat
 * empty, and every figure on them shrank with the column.
 *
 * Done by reaching up to that container rather than by adding a `fullBleed`
 * flag to the routing system, which would mean threading route config into the
 * layout for one page. The trade is explicit: this mutates an ancestor it does
 * not own, so it undoes itself precisely on unmount and touches nothing but the
 * two properties that constrain the width. Should a second board want this, a
 * route flag becomes the better answer and this should go.
 *
 * The vertical padding is left alone — the breadcrumb above the board still
 * needs somewhere to sit.
 *
 * @param ref an element inside the layout container
 */
export function useFullBleed(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    // `main > div` is the container itself. Matched from the board rather than
    // by a global query so that a page rendered anywhere else is simply a no-op.
    const container = ref.current?.closest('main > div');
    if (!container) return;

    container.classList.add('ops-bleed');
    return () => container.classList.remove('ops-bleed');
  }, [ref]);
}
