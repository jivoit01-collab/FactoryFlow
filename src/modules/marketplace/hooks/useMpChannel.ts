/**
 * Shared marketplace channel selection — persisted to localStorage and synced across
 * every mounted marketplace page, so switching Flipkart/Amazon on one page carries to
 * the rest instead of resetting to Flipkart on each page.
 */
import { useCallback, useEffect, useState } from 'react';

import type { MarketplaceChannel } from '../types/marketplace.types';

const KEY = 'mp.channel';
const listeners = new Set<(c: MarketplaceChannel) => void>();

function read(): MarketplaceChannel {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  return v === 'AMAZON' ? 'AMAZON' : 'FLIPKART';
}

export function useMpChannel(): [MarketplaceChannel, (c: MarketplaceChannel) => void] {
  const [channel, setLocal] = useState<MarketplaceChannel>(read);

  useEffect(() => {
    const l = (c: MarketplaceChannel) => setLocal(c);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const setChannel = useCallback((c: MarketplaceChannel) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {
      /* private mode — in-memory only */
    }
    listeners.forEach((fn) => fn(c));
  }, []);

  return [channel, setChannel];
}
