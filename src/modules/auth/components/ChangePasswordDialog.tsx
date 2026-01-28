import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { authService } from '@/core/auth/services/auth.service'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button, Input, Label } from '@/shared/components/ui'
import {
  changePasswordSchema,
  type ChangePasswordFormData,
  CHANGE_PASSWORD_FORM_DEFAULTS,
} from '../schemas/changePassword.schema'
import type { ApiError } from '@/core/api/types'

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * ChangePasswordDialog component
 *
 * Provides a dialog form for users to change their password.
 * Validates old and new passwords and calls the change password API.
 */
export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: CHANGE_PASSWORD_FORM_DEFAULTS,
  })

  const onSubmit = async (data: ChangePasswordFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await authService.changePassword(data.old_password, data.new_password)
      setSuccess(true)

      // Reset form and close dialog after 2 seconds
      setTimeout(() => {
        reset()
        setSuccess(false)
        onOpenChange(false)
      }, 2000)
    } catch (err) {
      // Handle ApiError type (from API interceptor) or generic Error
      if (err && typeof err === 'object' && 'message' in err && 'status' in err) {
        const apiError = err as ApiError
        setError(apiError.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to change password. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      reset()
      setError(null)
      setSuccess(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new password to update your account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
              Password changed successfully!
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="old_password">Current Password</Label>
            <div className="relative">
              <Input
                id="old_password"
                type={showOldPassword ? 'text' : 'password'}
                placeholder="Enter your current password"
                {...register('old_password')}
                disabled={isLoading || success}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                disabled={isLoading || success}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={showOldPassword ? 'Hide password' : 'Show password'}
              >
                {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.old_password && (
              <p className="text-sm text-destructive">{errors.old_password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter your new password"
                {...register('new_password')}
                disabled={isLoading || success}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isLoading || success}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.new_password && (
              <p className="text-sm text-destructive">{errors.new_password.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || success}>
              {isLoading ? 'Changing...' : success ? 'Success!' : 'Change Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
