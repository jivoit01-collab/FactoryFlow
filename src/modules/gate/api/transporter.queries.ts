import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transporterApi, type CreateTransporterRequest } from './transporter.api'

export function useTransporters() {
  return useQuery({
    queryKey: ['transporters'],
    queryFn: () => transporterApi.getList(),
    staleTime: 10 * 60 * 1000, // 10 minutes - transporters don't change often
  })
}

export function useCreateTransporter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTransporterRequest) => transporterApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] })
    },
  })
}