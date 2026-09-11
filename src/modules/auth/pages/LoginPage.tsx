import { Headset } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { APP_NAME, SUPPORT_CONTACT, SUPPORT_TEL_HREF } from '@/config/constants';
import { ROUTES } from '@/config/routes.config';
import type { ApiError } from '@/core/api/types';
import { loginSuccess } from '@/core/auth';
import { authService } from '@/core/auth/services/auth.service';
import { indexedDBService } from '@/core/auth/services/indexedDb.service';
import { useAppDispatch } from '@/core/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui';

import { LoginForm } from '../components/LoginForm';
import type { LoginFormData } from '../schemas/login.schema';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear any existing auth data from IndexedDB before login
      await indexedDBService.clearAuthData();

      // Login
      const response = await authService.login({
        email: data.email,
        password: data.password,
      });

      // Dispatch login success (this sets permissionsLoaded to false)
      dispatch(loginSuccess(response));

      // Navigate to company selection page
      navigate(ROUTES.COMPANY_SELECTION.path, { replace: true });
    } catch (err) {
      // Handle ApiError type (from API interceptor) or generic Error
      if (err && typeof err === 'object' && 'message' in err && 'status' in err) {
        // ApiError type from interceptor
        const apiError = err as ApiError;
        setError(apiError.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <img
            src="/JivoWellnessLogo.png"
            alt="Jivo Wellness Logo"
            className="h-16 w-auto dark:brightness-0 dark:invert"
          />
        </div>
        <CardTitle className="text-2xl font-bold">{APP_NAME}</CardTitle>
        <CardDescription>Enter your credentials to access the system</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}
        <LoginForm onSubmit={handleSubmit} isLoading={isLoading} />

        {/* Someone who cannot sign in cannot reach the support menu inside
            the app, so the number has to be on this screen too. */}
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Headset className="h-4 w-4" />
          <span>
            Trouble signing in? Call support at{' '}
            <a href={SUPPORT_TEL_HREF} className="font-medium text-foreground hover:underline">
              {SUPPORT_CONTACT.phone}
            </a>
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
