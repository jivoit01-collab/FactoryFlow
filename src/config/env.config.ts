import { API_CONFIG } from './constants';

interface EnvConfig {
  apiBaseUrl: string;
  appEnv: 'development' | 'staging' | 'production';
  isDev: boolean;
  isProd: boolean;
  enableMocking: boolean;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const env: EnvConfig = {
  apiBaseUrl: getEnvVar('VITE_API_BASE_URL', API_CONFIG.baseUrl),
  appEnv: getEnvVar('VITE_APP_ENV', 'development') as EnvConfig['appEnv'],
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  enableMocking: getEnvVar('VITE_ENABLE_MOCKING', 'false') === 'true',
};
