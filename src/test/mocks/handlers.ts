import { http, HttpResponse } from 'msw';

/**
 * Default MSW handlers for common API endpoints.
 * Add module-specific handlers here or create separate handler files
 * and spread them into this array.
 *
 * Usage in tests:
 *   import { server } from '@/test/mocks/server';
 *   server.use(http.get('/api/custom', () => HttpResponse.json({...})));
 */
export const handlers = [
  // Fallback handler for unmatched API requests — helps identify missing mocks
  http.all('/api/*', ({ request }) => {
    console.warn(`[MSW] Unhandled request: ${request.method} ${request.url}`);
    return HttpResponse.json(
      { detail: 'Not mocked' },
      { status: 500 },
    );
  }),
];
