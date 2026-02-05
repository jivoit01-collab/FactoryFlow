import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/core/store'
import { loginSuccess } from '@/core/auth'
import { authService } from '@/core/auth/services/auth.service'
import { indexedDBService } from '@/core/auth/services/indexedDb.service'
import { ROUTES } from '@/config/routes.config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui'
import { LoginForm } from '../components/LoginForm'
import type { LoginFormData } from '../schemas/login.schema'
import type { ApiError } from '@/core/api/types'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const handleSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Clear any existing auth data from IndexedDB before login
      await indexedDBService.clearAuthData()

      // Login
      const response = await authService.login({
        email: data.email,
        password: data.password,
      })

      // Dispatch login success (this sets permissionsLoaded to false)
      dispatch(loginSuccess(response))

      // Navigate to company selection page
      navigate(ROUTES.COMPANY_SELECTION.path, { replace: true })
    } catch (err) {
      // Handle ApiError type (from API interceptor) or generic Error
      if (err && typeof err === 'object' && 'message' in err && 'status' in err) {
        // ApiError type from interceptor
        const apiError = err as ApiError
        setError(apiError.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Login failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <img
            src="/JivoWellnessLogo.png"
            alt="Jivo Wellness Logo"
            className="h-16 w-auto dark:invert"
          />
        </div>
        <CardTitle className="text-2xl font-bold">Sampooran</CardTitle>
        <CardDescription>Enter your credentials to access the system</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}
        <LoginForm onSubmit={handleSubmit} isLoading={isLoading} />
      </CardContent>
    </Card>
  )
}
