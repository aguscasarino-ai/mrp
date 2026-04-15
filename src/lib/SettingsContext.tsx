import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToCollection } from './db';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

interface Settings {
  businessName: string;
  currency: string;
  productionCapacity?: number;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    businessName: 'MI NEGOCIO PROPIO',
    currency: '$',
    productionCapacity: 10
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToCollection('settings', (data) => {
      if (data.length > 0) {
        setSettings(data[0]);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      // Assuming we only have one settings doc
      const settingsId = (settings as any).id || 'global';
      await updateDoc(doc(db, 'settings', settingsId), newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
