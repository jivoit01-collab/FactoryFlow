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

  it('names what waits for SAP rather than calling every posting a failure', async () => {
    fetchSapHealth.mockResolvedValue({
      ...health('down'),
      waits_for_sap: ['goods returns', 'GRPOs', 'bill summary stamps'],
    });
    renderBanner();
    expect(
      await screen.findByText(
        /Goods returns, GRPOs and bill summary stamps are saved and post by themselves once SAP is back; other postings to SAP fail until then\./,
      ),
    ).toBeInTheDocument();
  });

  it('says how old the copy is that the screens are working from', async () => {
    const at = (h: number, m: number) => {
      const when = new Date();
      when.setHours(h, m, 0, 0);
      return when;
    };
    const clock = (when: Date) =>
      when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    fetchSapHealth.mockResolvedValue({
      ...health('up', 'down'),
      copy: {
        company_code: 'JIVO_OIL',
        frequent_as_of: at(0, 30).toISOString(),
        nightly_as_of: at(0, 5).toISOString(),
      },
    });
    renderBanner();
    const line = await screen.findByText(/working from its copy of SAP/);
    expect(line.textContent).toContain(`bills and open POs as of ${clock(at(0, 30))}`);
    expect(line.textContent).toContain(
      `items, BOMs, warehouses and vendors as of ${clock(at(0, 5))}`,
    );
    expect(line.textContent).toContain('stock figures are not copied');
  });

  it('falls back to the old warning when there is no copy', async () => {
    fetchSapHealth.mockResolvedValue({ ...health('up', 'down'), copy: null });
    renderBanner();
    expect(await screen.findByText(/may be empty or out of date/)).toBeInTheDocument();
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
