import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { configApi } from '@/lib/api';
import { useAuth } from './AuthContext';

interface AppConfigContextType {
  config: Record<string, string | null>;
  isLoading: boolean;
  getConfig: (key: string, defaultValue?: string | null) => string | null;
  refreshConfig: () => Promise<void>;
}

const AppConfigContext = createContext<AppConfigContextType | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [config, setConfig] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!isAuthenticated) {
      setConfig({});
      return;
    }

    setIsLoading(true);
    try {
      const response = await configApi.getAll();
      if (response.success && response.data) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error('Failed to load app config:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load config when authenticated
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const getConfig = useCallback((key: string, defaultValue: string | null = null): string | null => {
    return config[key] ?? defaultValue;
  }, [config]);

  const refreshConfig = useCallback(async () => {
    await loadConfig();
  }, [loadConfig]);

  const value: AppConfigContextType = {
    config,
    isLoading,
    getConfig,
    refreshConfig,
  };

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
}

// Specific config key constants
export const CONFIG_KEYS = {
  PLAYBOARD_SERVER_ONLY: 'playboard_server_only',
} as const;

// Convenience hook for playboard server-only mode
export function usePlayboardServerOnly(): boolean {
  const { getConfig } = useAppConfig();
  const value = getConfig(CONFIG_KEYS.PLAYBOARD_SERVER_ONLY, 'false');
  return value === 'true';
}
