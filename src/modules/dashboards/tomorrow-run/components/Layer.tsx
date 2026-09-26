import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Overlays live on <body>, not inside the page: the app's content column is a
 * containing block for `position: fixed`, so a panel rendered in place scrolls
 * with the page and slides under the top bar. The wrapper carries `.tr` so the
 * page's palette (and the app's `.dark`) still reach it.
 */
export function Layer({ children }: { children: ReactNode }) {
  return createPortal(<div className="tr tr-layer">{children}</div>, document.body);
}
