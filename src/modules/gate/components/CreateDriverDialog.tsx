import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import type { ApiError } from '@/core/api/types'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/components/ui'
import { useScrollToError } from '@/shared/hooks'

import { useCreateDriver, useUpdateDriver } from '../api/driver/driver.queries'
import {
  type DriverFormData,
  driverSchema,
  ID_PROOF_TYPES,
  ID_PROOF_VALIDATION,
} from '../schemas/driver.schema'

interface CreateDriverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (driver: {
    id: number
    name: string
    mobile_no: string
    license_no: string
    id_proof_type: string
    id_proof_number: string
    photo: string | null
  }) => void

  /** Optional — pass to enable edit mode */
  initialData?: {
    id: number
    name: string
    mobile_no: string
    license_no: string
    id_proof_type: string
    id_proof_number: string
    photo?: string | null
  }
}

export function CreateDriverDialog({ open, onOpenChange, onSuccess, initialData }: CreateDriverDialogProps) {
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({})
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isResettingRef = useRef(false)
  const createDriver = useCreateDriver()
  const updateDriver = useUpdateDriver()

  const isEditMode = !!initialData
  const mutation = isEditMode ? updateDriver : createDriver

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    setValue,
    watch,
  } = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      name: '',
      mobile_no: '',
      license_no: '',
      id_proof_type: 'Aadhar',
      id_proof_number: '',
    },
  })

  const photoFile = watch('photo')
  const idProofType = watch('id_proof_type')

  // Combine form errors and API errors for scroll-to-error
  const combinedErrors = useMemo(() => ({ ...errors, ...apiErrors }), [errors, apiErrors])
  useScrollToError(combinedErrors)

  // Reset form and errors when dialog opens/closes
  useEffect(() => {
    if (!open) return

    setApiErrors({})
    isResettingRef.current = true

    if (initialData) {
      reset({
        name: initialData.name,
        mobile_no: initialData.mobile_no,
        license_no: initialData.license_no,
        id_proof_type: initialData.id_proof_type as any,
        id_proof_number: initialData.id_proof_number,
      })

      setPhotoPreview(initialData.photo ?? null)
    } else {
      reset()
      setPhotoPreview(null)
    }
  }, [open, initialData, reset])

  // Clear id_proof_number when id_proof_type changes (skip during reset)
  useEffect(() => {
    if (isResettingRef.current) {
      isResettingRef.current = false
      return
    }
    setValue('id_proof_number', '', { shouldValidate: false })
  }, [idProofType, setValue])

  // Handle photo preview for new file uploads only
  useEffect(() => {
    if (photoFile && photoFile instanceof File) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(photoFile)
    }
  }, [photoFile])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setValue('photo', file, { shouldValidate: true })
    }
  }

  const handleRemovePhoto = () => {
    setValue('photo', undefined, { shouldValidate: false })
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSubmit = async (data: DriverFormData) => {
    setApiErrors({})
    try {
      const result = isEditMode
        ? await updateDriver.mutateAsync({ ...data, id: initialData.id })
        : await createDriver.mutateAsync(data)
      reset()
      setPhotoPreview(null)
      onOpenChange(false)
      onSuccess?.(result)
    } catch (error) {
      const apiError = error as ApiError

      if (apiError.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            const formField =
              field === 'mobile_no'
                ? 'mobile_no'
                : field === 'license_no'
                  ? 'license_no'
                  : field === 'id_proof_type'
                    ? 'id_proof_type'
                    : field === 'id_proof_number'
                      ? 'id_proof_number'
                      : field
            fieldErrors[formField] = messages[0]
            setError(formField as keyof DriverFormData, {
              type: 'server',
              message: messages[0],
            })
          }
        })
        setApiErrors(fieldErrors)
      } else {
        setApiErrors({
          general: apiError.message || (isEditMode ? 'Failed to update driver' : 'Failed to create driver'),
        })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Update Driver' : 'Add New Driver'}
          </DialogTitle>

          <DialogDescription>
            {isEditMode
              ? 'Update the driver details below.'
              : 'Fill in the details to create a new driver. All fields are required.'}
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
              Driver Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter driver name"
              {...register('name')}
              disabled={mutation.isPending}
              className={errors.name || apiErrors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            {apiErrors.name && !errors.name && (
              <p className="text-sm text-destructive">{apiErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile_no">
              Mobile Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mobile_no"
              placeholder="9876543210"
              {...register('mobile_no')}
              disabled={mutation.isPending}
              className={errors.mobile_no || apiErrors.mobile_no ? 'border-destructive' : ''}
            />
            {errors.mobile_no && (
              <p className="text-sm text-destructive">{errors.mobile_no.message}</p>
            )}
            {apiErrors.mobile_no && !errors.mobile_no && (
              <p className="text-sm text-destructive">{apiErrors.mobile_no}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="license_no">
              Driving License Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="license_no"
              placeholder="e.g., MH0220150001234"
              {...register('license_no', {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase()
                },
              })}
              disabled={mutation.isPending}
              className={errors.license_no || apiErrors.license_no ? 'border-destructive' : ''}
            />
            <p className="text-xs text-muted-foreground">
              Format: State code + RTO + Year + Number (e.g., MH0220150001234)
            </p>
            {errors.license_no && (
              <p className="text-sm text-destructive">{errors.license_no.message}</p>
            )}
            {apiErrors.license_no && !errors.license_no && (
              <p className="text-sm text-destructive">{apiErrors.license_no}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="id_proof_type">
              ID Proof Type <span className="text-destructive">*</span>
            </Label>
            <select
              id="id_proof_type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register('id_proof_type')}
              disabled={mutation.isPending}
            >
              {ID_PROOF_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.id_proof_type && (
              <p className="text-sm text-destructive">{errors.id_proof_type.message}</p>
            )}
            {apiErrors.id_proof_type && !errors.id_proof_type && (
              <p className="text-sm text-destructive">{apiErrors.id_proof_type}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="id_proof_number">
              ID Proof Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="id_proof_number"
              placeholder={
                ID_PROOF_VALIDATION[idProofType as keyof typeof ID_PROOF_VALIDATION]?.placeholder ||
                'Enter ID proof number'
              }
              {...register('id_proof_number', {
                onChange: (e) => {
                  // For Aadhar, only allow digits
                  if (idProofType === 'Aadhar') {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 12)
                  }
                  // For PAN Card and Voter ID, uppercase the input
                  else if (idProofType === 'PAN Card' || idProofType === 'Voter ID') {
                    e.target.value = e.target.value.toUpperCase()
                  }
                },
              })}
              maxLength={
                ID_PROOF_VALIDATION[idProofType as keyof typeof ID_PROOF_VALIDATION]?.maxLength ??
                50
              }
              disabled={mutation.isPending}
              className={
                errors.id_proof_number || apiErrors.id_proof_number ? 'border-destructive' : ''
              }
            />
            {idProofType && idProofType !== 'Other' && (
              <p className="text-xs text-muted-foreground">
                {ID_PROOF_VALIDATION[idProofType as keyof typeof ID_PROOF_VALIDATION]?.message}
              </p>
            )}
            {errors.id_proof_number && (
              <p className="text-sm text-destructive">{errors.id_proof_number.message}</p>
            )}
            {apiErrors.id_proof_number && !errors.id_proof_number && (
              <p className="text-sm text-destructive">{apiErrors.id_proof_number}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Driver Photo</Label>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={mutation.isPending}
                className="hidden"
                id="photo-upload"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={mutation.isPending}
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </Button>
                {photoPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRemovePhoto}
                    disabled={mutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {photoPreview && (
                <div className="relative w-full h-48 border rounded-md overflow-hidden bg-muted">
                  <img
                    src={photoPreview}
                    alt="Driver photo preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const placeholder = e.currentTarget.nextElementSibling as HTMLElement
                      if (placeholder) {
                        placeholder.style.display = 'flex'
                      }
                    }}
                  />
                  <div
                    className="absolute inset-0 items-center justify-center text-muted-foreground"
                    style={{ display: 'none' }}
                  >
                    <div className="text-center">
                      <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Failed to load image</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                  ? 'Update Driver'
                  : 'Create Driver'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
