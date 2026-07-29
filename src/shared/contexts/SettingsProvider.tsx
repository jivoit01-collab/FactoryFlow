import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { storage } from '../utils/storage';

const AI_ASSISTANT_STORAGE_KEY = 'FMS_ai_assistant_enabled';

interface SettingsContextType {
  /** Whether the floating AI assistant button is shown. Hidden by default. */
  aiEnabled: boolean;
  setAiEnabled: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

/**
 * App-wide user preferences that aren't tied to a single screen (persisted to
 * localStorage). Mounted next to ThemeProvider so any component can read/flip a
 * preference and every consumer re-renders — e.g. the Settings page toggles the
 * AI assistant and the layout shows/hides its button live.
 */
export function SettingsProvider({ children }: SettingsProviderProps) {
  const [aiEnabled, setAiEnabledState] = useState<boolean>(() => {
    const stored = storage.get<boolean>(AI_ASSISTANT_STORAGE_KEY);
    // Hidden by default until the user turns it on.
    return typeof stored === 'boolean' ? stored : false;
  });

  const setAiEnabled = useCallback((enabled: boolean) => {
    setAiEnabledState(enabled);
    storage.set(AI_ASSISTANT_STORAGE_KEY, enabled);
  }, []);

  const value = useMemo(() => ({ aiEnabled, setAiEnabled }), [aiEnabled, setAiEnabled]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
