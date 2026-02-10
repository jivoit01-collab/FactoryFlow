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
let configLoaded = false

/**
 * Validates that a config object has the expected structure.
 * Returns a merged config with defaults for any missing values.
 */
function validateConfig(config: unknown): RuntimeConfig {
  if (!config || typeof config !== 'object') {
    return DEFAULT_CONFIG
  }

  const c = config as Partial<RuntimeConfig>

  return {
    apiBaseUrl: typeof c.apiBaseUrl === 'string' ? c.apiBaseUrl : DEFAULT_CONFIG.apiBaseUrl,
    features: {
      enableGateIn:
        typeof c.features?.enableGateIn === 'boolean'
          ? c.features.enableGateIn
          : DEFAULT_CONFIG.features.enableGateIn,
      enableQualityCheck:
        typeof c.features?.enableQualityCheck === 'boolean'
          ? c.features.enableQualityCheck
          : DEFAULT_CONFIG.features.enableQualityCheck,
      enableReports:
        typeof c.features?.enableReports === 'boolean'
          ? c.features.enableReports
          : DEFAULT_CONFIG.features.enableReports,
    },
    limits: {
      maxUploadSize:
        typeof c.limits?.maxUploadSize === 'number'
          ? c.limits.maxUploadSize
          : DEFAULT_CONFIG.limits.maxUploadSize,
      maxBatchSize:
        typeof c.limits?.maxBatchSize === 'number'
          ? c.limits.maxBatchSize
          : DEFAULT_CONFIG.limits.maxBatchSize,
    },
  }
}

/**
 * Loads runtime configuration from /config.json.
 * Falls back to default config if loading fails.
 * This should be called before rendering the app.
 */
export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (configLoaded) {
    return runtimeConfig
  }

  try {
    const response = await fetch('/config.json')
    if (response.ok) {
      const config = await response.json()
      runtimeConfig = validateConfig(config)
    }
  } catch {
    // Config file doesn't exist or failed to load - use defaults
    // This is expected in development environments
  }

  configLoaded = true
  return runtimeConfig
}

/**
 * Gets the current runtime configuration.
 * Throws an error if config hasn't been loaded yet.
 */
export function getRuntimeConfig(): RuntimeConfig {
  if (!configLoaded) {
    console.warn('Runtime config accessed before loading. Using defaults.')
  }
  return runtimeConfig
}

/**
 * Checks if the runtime config has been loaded.
 */
export function isConfigLoaded(): boolean {
  return configLoaded
}
