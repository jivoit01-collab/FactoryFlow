import { useQuery } from '@tanstack/react-query';

import { departmentApi } from './department.api';

export function useDepartments(enabled: boolean = true) {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.getDepartments(),
    enabled,
  });
}
