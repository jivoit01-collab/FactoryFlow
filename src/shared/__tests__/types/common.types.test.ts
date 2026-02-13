import { describe, it, expect } from 'vitest';
import type {
  BaseEntity,
  SelectOption,
  PaginationState,
  SortState,
  TableState,
  AsyncStatus,
  AsyncState,
} from '../../types/common.types';

describe('Common Types', () => {
  // These tests verify that the types are correctly exported and usable.
  // Since TypeScript types are erased at runtime, we verify structural
  // compatibility using objects that satisfy the type constraints.

  it('BaseEntity type is usable', () => {
    const entity: BaseEntity = {
      id: '1',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
    };
    expect(entity.id).toBe('1');
    expect(entity.createdAt).toBe('2026-01-01');
    expect(entity.updatedAt).toBe('2026-01-02');
  });

  it('SelectOption type is usable with default generic', () => {
    const option: SelectOption = {
      label: 'Option 1',
      value: 'opt1',
    };
    expect(option.label).toBe('Option 1');
    expect(option.value).toBe('opt1');
  });

  it('SelectOption supports custom generic type', () => {
    const option: SelectOption<number> = {
      label: 'Number Option',
      value: 42,
      disabled: true,
    };
    expect(option.value).toBe(42);
    expect(option.disabled).toBe(true);
  });

  it('PaginationState type is usable', () => {
    const pagination: PaginationState = {
      page: 1,
      pageSize: 20,
      total: 100,
      totalPages: 5,
    };
    expect(pagination.page).toBe(1);
    expect(pagination.totalPages).toBe(5);
  });

  it('SortState type is usable', () => {
    const sort: SortState = {
      sortBy: 'name',
      sortOrder: 'asc',
    };
    expect(sort.sortBy).toBe('name');
    expect(sort.sortOrder).toBe('asc');
  });

  it('TableState extends PaginationState and SortState', () => {
    const table: TableState = {
      page: 1,
      pageSize: 10,
      total: 50,
      totalPages: 5,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: 'query',
    };
    expect(table.page).toBe(1);
    expect(table.sortBy).toBe('createdAt');
    expect(table.search).toBe('query');
  });

  it('AsyncStatus literal type values', () => {
    const statuses: AsyncStatus[] = ['idle', 'loading', 'success', 'error'];
    expect(statuses).toHaveLength(4);
  });

  it('AsyncState type is usable', () => {
    const state: AsyncState<string[]> = {
      data: ['item1', 'item2'],
      status: 'success',
      error: null,
    };
    expect(state.data).toHaveLength(2);
    expect(state.status).toBe('success');
    expect(state.error).toBeNull();
  });

  it('AsyncState with null data', () => {
    const state: AsyncState<number> = {
      data: null,
      status: 'idle',
      error: null,
    };
    expect(state.data).toBeNull();
  });

  it('AsyncState with error', () => {
    const state: AsyncState<string> = {
      data: null,
      status: 'error',
      error: 'Something went wrong',
    };
    expect(state.error).toBe('Something went wrong');
  });
});
