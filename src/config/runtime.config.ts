export interface RuntimeConfig {
  apiBaseUrl: string
  features: {
    enableGateIn: boolean
    enableQualityCheck: boolean
    enableReports: boolean
  }
  limits: {
    maxUploadSize: number // in bytes
    maxBatchSize: number
  }
}

const DEFAULT_CONFIG: RuntimeConfig = {
  apiBaseUrl: '/api',
  features: {
    enableGateIn: true,
    enableQualityCheck: true,
    enableReports: false,
  },
  limits: {
    maxUploadSize: 10 * 1024 * 1024, // 10MB
    maxBatchSize: 100,
  },
}

let runtimeConfig: RuntimeConfig = DEFAULT_CONFIG

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch('/config.json')
    if (response.ok) {
      const config = await response.json()
      runtimeConfig = { ...DEFAULT_CONFIG, ...config }
    }
  } catch (error) {
    console.warn('Failed to load runtime config, using defaults:', error)
  }
  return runtimeConfig
}

export function getRuntimeConfig(): RuntimeConfig {
  return runtimeConfig
}
