import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from '@/shared/components/ui'
import { useCreateTransporter } from '../api/transporter.queries'
import { transporterSchema, type TransporterFormData } from '../schemas/transporter.schema'
import type { ApiError } from '@/core/api/types'

interface CreateTransporterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (transporterName: string) => void
}

export function CreateTransporterDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTransporterDialogProps) {
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})
  const createTransporter = useCreateTransporter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<TransporterFormData>({
    resolver: zodResolver(transporterSchema),
    defaultValues: {
      name: '',
      contact_person: '',
      mobile_no: '',
    },
  })

  // Reset form and errors when dialog opens/closes
  useEffect(() => {
    if (open) {
      reset()
      setApiErrors({})
    }
  }, [open, reset])

  const onSubmit = async (data: TransporterFormData) => {
    setApiErrors({})
    try {
      const result = await createTransporter.mutateAsync(data)
      reset()
      onOpenChange(false)
      if (onSuccess) {
        onSuccess(result.name)
      }
    } catch (error) {
      // Handle API errors
      const apiError = error as ApiError

      if (apiError.errors) {
        // Map API errors to form fields
        const fieldErrors: Record<string, string> = {}
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0]
            // Also set react-hook-form error
            setError(field as keyof TransporterFormData, {
              type: 'server',
              message: messages[0],
            })
          }
        })
        setApiErrors(fieldErrors)
      } else {
        // General error message - use the message from ApiError which is already extracted
        setApiErrors({ general: apiError.message || 'Failed to create transporter' })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Transporter</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new transporter. All fields are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {apiErrors.general && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {apiErrors.general}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              Transporter Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter transporter name"
              {...register('name')}
              disabled={createTransporter.isPending}
              className={errors.name || apiErrors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            {apiErrors.name && !errors.name && (
              <p className="text-sm text-destructive">{apiErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_person">
              Contact Person <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact_person"
              placeholder="Enter contact person name"
              {...register('contact_person')}
              disabled={createTransporter.isPending}
              className={
                errors.contact_person || apiErrors.contact_person ? 'border-destructive' : ''
              }
            />
            {errors.contact_person && (
              <p className="text-sm text-destructive">{errors.contact_person.message}</p>
            )}
            {apiErrors.contact_person && !errors.contact_person && (
              <p className="text-sm text-destructive">{apiErrors.contact_person}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile_no">
              Mobile Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mobile_no"
              placeholder="Enter mobile number"
              {...register('mobile_no')}
              disabled={createTransporter.isPending}
              className={errors.mobile_no || apiErrors.mobile_no ? 'border-destructive' : ''}
            />
            {errors.mobile_no && (
              <p className="text-sm text-destructive">{errors.mobile_no.message}</p>
            )}
            {apiErrors.mobile_no && !errors.mobile_no && (
              <p className="text-sm text-destructive">{apiErrors.mobile_no}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTransporter.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTransporter.isPending}>
              {createTransporter.isPending ? 'Creating...' : 'Create Transporter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
