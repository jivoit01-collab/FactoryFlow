/**
 * The app-wide "SAP is down" strip.
 *
 * It sits above every page, so the one thing it must never do is get in the
 * way when there is nothing to say: SAP up, SAP not yet probed, the poll itself
 * failing, or a backend that predates the endpoint all render nothing.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SapHealth } from '@/core/sapHealth';

const fetchSapHealth = vi.fn<() => Promise<SapHealth>>();

vi.mock('@/core/sapHealth/sapHealth.api', () => ({
  fetchSapHealth: () => fetchSapHealth(),
}));

// Imported after the mock is declared.
const { SapHealthBanner, SAP_UNAVAILABLE_EVENT } = await import('@/core/sapHealth');

function health(sl: 'up' | 'down' | 'unknown', hana: 'up' | 'down' | 'unknown' = 'up'): SapHealth {
  const component = (status: 'up' | 'down' | 'unknown') => ({
    status,
    since: status === 'unknown' ? null : new Date().toISOString(),
    checked_at: new Date().toISOString(),
    error: '',
  });
  return {
    ok: sl !== 'down' && hana !== 'down',
    components: { service_layer: component(sl), hana: component(hana) },
  };
}

function renderBanner() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SapHealthBanner />
    </QueryClientProvider>,
  );
}

describe('SapHealthBanner', () => {
  beforeEach(() => {
    fetchSapHealth.mockReset();
  });

  it('says postings will fail while the Service Layer is down', async () => {
    fetchSapHealth.mockResolvedValue(health('down'));
    renderBanner();
    expect(await screen.findByText(/SAP is not accepting postings/)).toBeInTheDocument();
    expect(screen.queryByText(/SAP data cannot be read/)).not.toBeInTheDocument();
  });

  it('says reads are affected while HANA is down', async () => {
    fetchSapHealth.mockResolvedValue(health('up', 'down'));
    renderBanner();
    expect(await screen.findByText(/SAP data cannot be read/)).toBeInTheDocument();
  });

  it.each([
    ['SAP is up', () => Promise.resolve(health('up'))],
    ['SAP has not been probed yet', () => Promise.resolve(health('unknown', 'unknown'))],
    ['the poll itself fails', () => Promise.reject(new Error('Network Error'))],
    ['the backend sends something else', () => Promise.resolve({} as SapHealth)],
  ])('renders nothing when %s', async (_label, answer) => {
    fetchSapHealth.mockImplementation(answer);
    const { container } = renderBanner();
    await waitFor(() => expect(fetchSapHealth).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('asks again at once when a request comes back SAP_UNAVAILABLE', async () => {
    fetchSapHealth.mockResolvedValue(health('up'));
    renderBanner();
    await waitFor(() => expect(fetchSapHealth).toHaveBeenCalledTimes(1));

    fetchSapHealth.mockResolvedValue(health('down'));
    window.dispatchEvent(new Event(SAP_UNAVAILABLE_EVENT));

    expect(await screen.findByText(/SAP is not accepting postings/)).toBeInTheDocument();
    expect(fetchSapHealth).toHaveBeenCalledTimes(2);
  });
});
