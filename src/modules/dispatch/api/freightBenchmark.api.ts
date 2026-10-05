import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/core/api';

import type {
  FreightBenchmarkTable,
  FreightDestination,
  FreightDestinationInput,
  FreightSlab,
  FreightSlabInput,
} from '../types/freightBenchmark.types';

export const freightBenchmarkApi = {
  async getTable(): Promise<FreightBenchmarkTable> {
    const response = await apiClient.get<FreightBenchmarkTable>(
      API_ENDPOINTS.DISPATCH.FREIGHT_BENCHMARKS,
    );
    return response.data;
  },
  async createDestination(data: FreightDestinationInput): Promise<FreightDestination> {
    const response = await apiClient.post<FreightDestination>(
      API_ENDPOINTS.DISPATCH.FREIGHT_BENCHMARK_DESTINATIONS,
      data,
    );
    return response.data;
  },
  async updateDestination(id: number, data: FreightDestinationInput): Promise<FreightDestination> {
    const response = await apiClient.put<FreightDestination>(
      API_ENDPOINTS.DISPATCH.FREIGHT_BENCHMARK_DESTINATION(id),
      data,
    );
    return response.data;
  },
  async deleteDestination(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.DISPATCH.FREIGHT_BENCHMARK_DESTINATION(id));
  },
  async createSlab(data: FreightSlabInput): Promise<FreightSlab> {
    const response = await apiClient.post<FreightSlab>(
      API_ENDPOINTS.DISPATCH.FREIGHT_BENCHMARK_SLABS,
      data,
    );
    return response.data;
  },
  async updateSlab(id: number, data: FreightSlabInput): Promise<FreightSlab> {
    const response = await apiClient.put<FreightSlab>(
      API_ENDPOINTS.DISPATCH.FREIGHT_BENCHMARK_SLAB(id),
      data,
    );
    return response.data;
  },
  async deleteSlab(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.DISPATCH.FREIGHT_BENCHMARK_SLAB(id));
  },
};

export const FREIGHT_BENCHMARK_QUERY_KEY = ['dispatch', 'freight-benchmarks'] as const;

function invalidate(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: FREIGHT_BENCHMARK_QUERY_KEY });
}

/**
 * The whole table in one read. It is a hundred-odd destinations and a dozen
 * slabs, and the search, the state filter and the column set all work on the
 * table as a whole.
 */
export function useFreightBenchmarks() {
  return useQuery({
    queryKey: FREIGHT_BENCHMARK_QUERY_KEY,
    queryFn: () => freightBenchmarkApi.getTable(),
    // Benchmarks change when the fare sheet does, a few times a year.
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveFreightDestination() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | null; data: FreightDestinationInput }) =>
      id === null
        ? freightBenchmarkApi.createDestination(data)
        : freightBenchmarkApi.updateDestination(id, data),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteFreightDestination() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => freightBenchmarkApi.deleteDestination(id),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useSaveFreightSlab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | null; data: FreightSlabInput }) =>
      id === null ? freightBenchmarkApi.createSlab(data) : freightBenchmarkApi.updateSlab(id, data),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteFreightSlab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => freightBenchmarkApi.deleteSlab(id),
    onSuccess: () => invalidate(queryClient),
  });
}
