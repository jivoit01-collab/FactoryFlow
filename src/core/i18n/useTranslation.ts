// Placeholder hook for translations
// Returns the key as-is for now, making it easy to add i18n later

export function useTranslation() {
  // When implementing i18n, this will use useTranslation from react-i18next
  const t = (key: string, _options?: Record<string, unknown>): string => {
    // For now, just return the key
    // Future: return i18next.t(key, options)
    return key
  }

  return { t }
}
