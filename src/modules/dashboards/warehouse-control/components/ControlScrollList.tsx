import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

export interface ControlScrollListProps {
  children: ReactNode;
  /**
   * Height cap on the scroll box. Pass a Tailwind `max-h-*` literal — a short
   * list stays short, and only a long one starts scrolling. Ignored under
   * `grow`, which takes its height from the panel instead.
   */
  maxHeight?: string;
  /**
   * Take whatever height the panel has left over.
   *
   * Panels sharing a grid row are stretched to the tallest of them; without this
   * the short ones would simply have blank space under their body. The list that
   * opts in absorbs it and shows more rows instead.
   */
  grow?: boolean;
  /** Set for a grid of cards instead of a divided list of rows. */
  as?: 'list' | 'plain';
  className?: string;
}

/**
 * A bounded, scrollable list.
 *
 * The panels render their whole set rather than a first page, so the count in a
 * section header is always something the reader can actually reach — "91 bills"
 * that stops at twelve is worse than no number at all. The height cap keeps one
 * long list from stretching the board, and `overscroll-contain` stops a flick
 * inside the list from carrying on and scrolling the page behind it, which is
 * what makes a nested scroll area usable on a phone.
 *
 * The border lives on the outer element and the scrolling on the inner one, so
 * the rounded corners are not clipped away by the scroll box.
 */
export function ControlScrollList({
  children,
  maxHeight = 'max-h-[30rem]',
  as = 'list',
  grow = false,
  className,
}: ControlScrollListProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border',
        grow ? 'flex min-h-0 flex-1 flex-col' : 'shrink-0',
      )}
    >
      <div
        className={cn(
          'overflow-y-auto overscroll-contain',
          grow ? 'min-h-0 flex-1' : maxHeight,
          className,
        )}
      >
        {as === 'list' ? <ul className="divide-y">{children}</ul> : children}
      </div>
    </div>
  );
}
