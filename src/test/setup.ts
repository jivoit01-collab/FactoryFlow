import '@testing-library/jest-dom';

import { server } from './mocks/server';

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers between tests for isolation
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
