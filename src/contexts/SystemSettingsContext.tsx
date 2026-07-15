import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';

interface SystemSettingsContextType {
  settings: any;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export function SystemSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/public/config');
      setSettings(res.data.settings);
    } catch (err) {
      console.error('Failed to fetch system settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SystemSettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
}
