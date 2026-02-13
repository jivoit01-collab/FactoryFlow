import { describe, it, expect } from 'vitest';
import type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationParams,
  ListParams,
} from '@/core/api/types';

// ═══════════════════════════════════════════════════════════════
// API Types (src/core/api/types.ts) — Direct Import
//
// Pure TypeScript interfaces with zero runtime deps.
// ═══════════════════════════════════════════════════════════════

describe('API Types', () => {
  // ─── ApiResponse<T> ───────────────────────────────────────

  it('ApiResponse has data, success, and optional message', () => {
    const response: ApiResponse<string> = { data: 'hello', success: true };
    expect(response.data).toBe('hello');
    expect(response.success).toBe(true);
    expect(response.message).toBeUndefined();
  });

  it('ApiResponse accepts message field', () => {
    const response: ApiResponse<number> = { data: 42, success: true, message: 'OK' };
    expect(response.message).toBe('OK');
  });

  // ─── ApiError ─────────────────────────────────────────────

  it('ApiError has message and status as required fields', () => {
    const error: ApiError = { message: 'Not Found', status: 404 };
    expect(error.message).toBe('Not Found');
    expect(error.status).toBe(404);
  });

  it('ApiError accepts optional code, errors, detail, response', () => {
    const error: ApiError = {
      message: 'Validation failed',
      status: 400,
      code: 'VALIDATION_ERROR',
      errors: { email: ['Invalid email'] },
      detail: 'Check fields',
      response: {
        data: { detail: 'server detail', message: 'server msg', errors: { name: ['required'] } },
        status: 400,
      },
    };
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.errors?.email).toEqual(['Invalid email']);
    expect(error.detail).toBe('Check fields');
    expect(error.response?.data?.detail).toBe('server detail');
  });

  // ─── PaginatedResponse<T> ─────────────────────────────────

  it('PaginatedResponse has data array and pagination object', () => {
    const response: PaginatedResponse<{ id: number }> = {
      data: [{ id: 1 }, { id: 2 }],
      pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
    };
    expect(response.data).toHaveLength(2);
    expect(response.pagination.page).toBe(1);
    expect(response.pagination.totalPages).toBe(1);
  });

  // ─── PaginationParams ─────────────────────────────────────

  it('PaginationParams has all optional fields', () => {
    const params: PaginationParams = {};
    expect(params.page).toBeUndefined();
    expect(params.pageSize).toBeUndefined();
    expect(params.sortBy).toBeUndefined();
    expect(params.sortOrder).toBeUndefined();
  });

  it('PaginationParams sortOrder accepts asc or desc', () => {
    const asc: PaginationParams = { sortOrder: 'asc' };
    const desc: PaginationParams = { sortOrder: 'desc' };
    expect(asc.sortOrder).toBe('asc');
    expect(desc.sortOrder).toBe('desc');
  });

  // ─── ListParams ───────────────────────────────────────────

  it('ListParams extends PaginationParams with search and filters', () => {
    const params: ListParams = {
      page: 1,
      pageSize: 20,
      search: 'query',
      filters: { status: 'active' },
    };
    expect(params.search).toBe('query');
    expect(params.filters?.status).toBe('active');
  });

  it('ListParams allows arbitrary additional keys via index signature', () => {
    const params: ListParams = { customField: 'value' };
    expect(params.customField).toBe('value');
  });
});
