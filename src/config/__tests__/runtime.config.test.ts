import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// runtime.config — Tests
//
// Module-level state (runtimeConfig, configLoaded) requires
// vi.resetModules() + dynamic import for isolation between tests.
// ═══════════════════════════════════════════════════════════════

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ═══════════════════════════════════════════════════════════════
// getRuntimeConfig() — Default values
// ═══════════════════════════════════════════════════════════════

describe('getRuntimeConfig() — Default values', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('returns config object with apiBaseUrl, features, limits', async () => {
    const { getRuntimeConfig } = await import('@/config/runtime.config');
    const config = getRuntimeConfig();
    expect(config).toHaveProperty('apiBaseUrl');
    expect(config).toHaveProperty('features');
    expect(config).toHaveProperty('limits');
  });

  it('default apiBaseUrl is "/api"', async () => {
    const { getRuntimeConfig } = await import('@/config/runtime.config');
    expect(getRuntimeConfig().apiBaseUrl).toBe('/api');
  });

  it('default features.enableGateIn is true', async () => {
    const { getRuntimeConfig } = await import('@/config/runtime.config');
    expect(getRuntimeConfig().features.enableGateIn).toBe(true);
  });

  it('default features.enableQualityCheck is true', async () => {
    const { getRuntimeConfig } = await import('@/config/runtime.config');
    expect(getRuntimeConfig().features.enableQualityCheck).toBe(true);
  });

  it('default features.enableReports is false', async () => {
    const { getRuntimeConfig } = await import('@/config/runtime.config');
    expect(getRuntimeConfig().features.enableReports).toBe(false);
  });

  it('default limits.maxUploadSize is 10MB (10485760)', async () => {
    const { getRuntimeConfig } = await import('@/config/runtime.config');
    expect(getRuntimeConfig().limits.maxUploadSize).toBe(10 * 1024 * 1024);
  });

  it('default limits.maxBatchSize is 100', async () => {
    const { getRuntimeConfig } = await import('@/config/runtime.config');
    expect(getRuntimeConfig().limits.maxBatchSize).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════
// isConfigLoaded()
// ═══════════════════════════════════════════════════════════════

describe('isConfigLoaded()', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('returns false before loadRuntimeConfig is called', async () => {
    const { isConfigLoaded } = await import('@/config/runtime.config');
    expect(isConfigLoaded()).toBe(false);
  });

  it('returns true after loadRuntimeConfig completes', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const { isConfigLoaded, loadRuntimeConfig } = await import('@/config/runtime.config');
    await loadRuntimeConfig();
    expect(isConfigLoaded()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// loadRuntimeConfig() — Success path
// ═══════════════════════════════════════════════════════════════

describe('loadRuntimeConfig() — Success path', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('fetches /config.json', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    await loadRuntimeConfig();
    expect(mockFetch).toHaveBeenCalledWith('/config.json');
  });

  it('returns merged config on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ apiBaseUrl: '/custom-api' }),
    });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const config = await loadRuntimeConfig();
    expect(config.apiBaseUrl).toBe('/custom-api');
    // Defaults preserved for fields not in fetched config
    expect(config.features.enableGateIn).toBe(true);
    expect(config.limits.maxBatchSize).toBe(100);
  });

  it('overrides features from fetched config', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          features: { enableGateIn: false, enableQualityCheck: false, enableReports: true },
        }),
    });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const config = await loadRuntimeConfig();
    expect(config.features.enableGateIn).toBe(false);
    expect(config.features.enableQualityCheck).toBe(false);
    expect(config.features.enableReports).toBe(true);
  });

  it('overrides limits from fetched config', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          limits: { maxUploadSize: 5000, maxBatchSize: 50 },
        }),
    });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const config = await loadRuntimeConfig();
    expect(config.limits.maxUploadSize).toBe(5000);
    expect(config.limits.maxBatchSize).toBe(50);
  });
});

// ═══════════════════════════════════════════════════════════════
// loadRuntimeConfig() — Validation
// ═══════════════════════════════════════════════════════════════

describe('loadRuntimeConfig() — Validation', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('returns defaults when fetched config is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null),
    });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const config = await loadRuntimeConfig();
    expect(config.apiBaseUrl).toBe('/api');
  });

  it('returns defaults when fetched config is not an object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve('not-an-object'),
    });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const config = await loadRuntimeConfig();
    expect(config.apiBaseUrl).toBe('/api');
  });

  it('validates apiBaseUrl is string, falls back to default otherwise', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ apiBaseUrl: 12345 }),
    });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const config = await loadRuntimeConfig();
    expect(config.apiBaseUrl).toBe('/api');
  });

  it('validates feature booleans, falls back to defaults for non-boolean', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          features: { enableGateIn: 'yes', enableQualityCheck: 1 },
        }),
    });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const config = await loadRuntimeConfig();
    expect(config.features.enableGateIn).toBe(true); // default
    expect(config.features.enableQualityCheck).toBe(true); // default
  });

  it('validates limits are numbers, falls back to defaults for non-number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          limits: { maxUploadSize: 'big', maxBatchSize: true },
        }),
    });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const config = await loadRuntimeConfig();
    expect(config.limits.maxUploadSize).toBe(10 * 1024 * 1024); // default
    expect(config.limits.maxBatchSize).toBe(100); // default
  });
});

// ═══════════════════════════════════════════════════════════════
// loadRuntimeConfig() — Failure paths
// ═══════════════════════════════════════════════════════════════

describe('loadRuntimeConfig() — Failure paths', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('returns defaults when fetch fails (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const config = await loadRuntimeConfig();
    expect(config.apiBaseUrl).toBe('/api');
    expect(config.features.enableGateIn).toBe(true);
  });

  it('returns defaults when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const config = await loadRuntimeConfig();
    expect(config.apiBaseUrl).toBe('/api');
  });
});

// ═══════════════════════════════════════════════════════════════
// loadRuntimeConfig() — Caching
// ═══════════════════════════════════════════════════════════════

describe('loadRuntimeConfig() — Caching', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('returns cached config on second call without re-fetching', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ apiBaseUrl: '/cached' }),
    });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const first = await loadRuntimeConfig();
    const second = await loadRuntimeConfig();
    expect(first).toBe(second);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('sets configLoaded to true after first load', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const { loadRuntimeConfig, isConfigLoaded } = await import('@/config/runtime.config');
    expect(isConfigLoaded()).toBe(false);
    await loadRuntimeConfig();
    expect(isConfigLoaded()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// loadRuntimeConfig() — Edge Cases
// ═══════════════════════════════════════════════════════════════

describe('loadRuntimeConfig() — Edge Cases', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('handles empty JSON object {}', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const config = await loadRuntimeConfig();
    // All defaults should be preserved
    expect(config.apiBaseUrl).toBe('/api');
    expect(config.features.enableGateIn).toBe(true);
    expect(config.limits.maxBatchSize).toBe(100);
  });

  it('handles partial features object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          features: { enableReports: true },
        }),
    });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const config = await loadRuntimeConfig();
    expect(config.features.enableReports).toBe(true);
    expect(config.features.enableGateIn).toBe(true); // default preserved
    expect(config.features.enableQualityCheck).toBe(true); // default preserved
  });

  it('handles partial limits object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          limits: { maxBatchSize: 200 },
        }),
    });
    const { loadRuntimeConfig } = await import('@/config/runtime.config');
    const config = await loadRuntimeConfig();
    expect(config.limits.maxBatchSize).toBe(200);
    expect(config.limits.maxUploadSize).toBe(10 * 1024 * 1024); // default preserved
  });
});
