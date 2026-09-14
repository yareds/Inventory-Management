import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SystemSettings } from '../types';

const defaultSettings: SystemSettings = {
  businessName: 'Inventory Management',
  businessLogo: '',
  currency: 'USD',
  currencySymbol: '$',
  dateFormat: 'MM/DD/YYYY',
  defaultReorderLevel: 10,
  allowNegativeInventory: false,
  lowStockAlertsEnabled: true,
  emailAlerts: true,
};

interface SettingsContextType {
  settings: SystemSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<SystemSettings>, user: any) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const ref = doc(db, 'settings', 'general');
    const unsubscribe = onSnapshot(
      ref,
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings({ ...defaultSettings, ...docSnap.data() } as SystemSettings);
        } else {
          // Initialize default if doesn't exist
          setDoc(ref, {
            ...defaultSettings,
            updatedAt: serverTimestamp(),
            updatedBy: 'system',
          }).catch(console.error);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Settings snapshot error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateSettings = async (newSettings: Partial<SystemSettings>, user: any) => {
    const ref = doc(db, 'settings', 'general');
    const updated = {
      ...settings,
      ...newSettings,
      updatedAt: serverTimestamp(),
      updatedBy: user?.displayName || user?.email || 'admin',
    };
    await setDoc(ref, updated, { merge: true });
    setSettings(updated);
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
