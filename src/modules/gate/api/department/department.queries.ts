import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type CreateDepartmentRequest, departmentApi } from './department.api';

export function useDepartments(enabled: boolean = true) {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.getDepartments(),
    enabled,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentRequest) => departmentApi.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}
