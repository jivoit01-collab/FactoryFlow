import { useMutation } from '@tanstack/react-query'
import { qualityControlApi, type CreateQualityControlRequest } from './qualityControl.api'

export function useCreateQualityControl(poItemId: number) {
  return useMutation({
    mutationFn: (data: CreateQualityControlRequest) => qualityControlApi.create(poItemId, data),
  })
}
