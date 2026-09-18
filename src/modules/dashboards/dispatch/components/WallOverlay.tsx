import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/utils';

/**
 * A full-screen layer for the wall board.
 *
 * It portals into `document.fullscreenElement` when the board is in wall mode
 * and into `document.body` otherwise. That is the whole reason this exists: a
 * portal fixed to `body` renders OUTSIDE the fullscreen element's subtree, and
 * the browser paints nothing outside that subtree — so an ordinary dialog opens
 * perfectly at a desk and is invisible on the wall, which is the one place
 * nobody is watching closely enough to notice.
 *
 * The target is re-resolved on `fullscreenchange`, so entering or leaving wall
 * mode with a card open moves it rather than stranding it.
 *
 * Escape closes, and so does a click on the backdrop. Both matter more than
 * usual here: the board is often driven from across a room with a wireless
 * mouse, and a card that could only be dismissed by hitting a small × would
 * strand the display on one bill.
 */
export function WallOverlay({
  onClose,
  labelledBy,
  width = 'max-w-2xl',
  children,
}: {
  onClose: () => void;
  /** id of the element naming this layer, for screen readers. */
  labelledBy?: string;
  /**
   * How wide the card may grow — a Tailwind max-width class.
   *
   * Defaulted to the width a bill reads best at. A card that is mostly tables
   * rather than fields needs more, and passing the class is cheaper than each
   * caller rebuilding the portal it sits in.
   */
  width?: string;
  children: ReactNode;
}) {
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    const resolve = () => setHost(document.fullscreenElement ?? document.body);
    resolve();
    document.addEventListener('fullscreenchange', resolve);
    return () => document.removeEventListener('fullscreenchange', resolve);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!host) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center p-4 duration-200"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />
      <div
        className={cn(
          'animate-in zoom-in-95 slide-in-from-bottom-2 relative z-10 flex max-h-full w-full flex-col duration-200',
          width,
        )}
      >
        {children}
      </div>
    </div>,
    host,
  );
}
