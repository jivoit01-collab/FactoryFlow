import type { ReactNode } from 'react';

import { BoardEmbedContext } from './boardEmbed.context';

/**
 * Marks everything inside as a slide rather than a page of its own.
 *
 * See `boardEmbed.context` for what that changes and why it is a context
 * instead of a prop threaded through three pages.
 */
export function BoardEmbedProvider({ children }: { children: ReactNode }) {
  return <BoardEmbedContext.Provider value={true}>{children}</BoardEmbedContext.Provider>;
}
