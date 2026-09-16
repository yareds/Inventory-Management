import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SystemSettings } from '../types';
import { DEMO_SETTINGS } from '../lib/demoData';

const defaultSettings: SystemSettings = DEMO_SETTINGS;

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
    let isMounted = true;
    try {
      const ref = doc(db, 'settings', 'general');
      const unsubscribe = onSnapshot(
        ref,
        (docSnap) => {
          if (!isMounted) return;
          if (docSnap.exists()) {
            setSettings({ ...defaultSettings, ...docSnap.data() } as SystemSettings);
          } else {
            // Attempt to initialize default if doesn't exist
            setDoc(ref, {
              ...defaultSettings,
              updatedAt: serverTimestamp(),
              updatedBy: 'system',
            }).catch(() => {
              // Ignore initial write error if permission denied
            });
          }
          setLoading(false);
        },
        (err) => {
          if (!isMounted) return;
          if (err?.code === 'permission-denied') {
            // Handled gracefully: Fall back to defaultSettings without throwing console error
            setSettings(defaultSettings);
          } else {
            console.warn('Settings snapshot issue:', err.message);
          }
          setLoading(false);
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch {
      setLoading(false);
    }
  }, []);

  const updateSettings = async (newSettings: Partial<SystemSettings>, user: any) => {
    const updated = {
      ...settings,
      ...newSettings,
      updatedAt: new Date(),
      updatedBy: user?.displayName || user?.email || 'admin',
    };
    setSettings(updated);

    try {
      const ref = doc(db, 'settings', 'general');
      await setDoc(ref, {
        ...updated,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('Unable to persist settings to Firestore:', err.message);
      }
    }
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
