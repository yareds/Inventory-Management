import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FIRESTORE_RULES_SOURCE } from '../lib/demoData';
import appletConfig from '../../firebase-applet-config.json';

interface FirestoreStatusContextType {
  hasPermissionError: boolean;
  projectId: string;
  databaseId: string;
  rulesCode: string;
  isChecking: boolean;
  isBannerDismissed: boolean;
  checkConnection: () => Promise<boolean>;
  dismissBanner: () => void;
  showBanner: () => void;
  markPermissionDenied: () => void;
  markPermissionGranted: () => void;
}

const FirestoreStatusContext = createContext<FirestoreStatusContextType | undefined>(undefined);

export function FirestoreStatusProvider({ children }: { children: React.ReactNode }) {
  const [hasPermissionError, setHasPermissionError] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);

  const projectId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || appletConfig.projectId || 'inventory-management-49722';
  const databaseId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_DATABASE_ID) || appletConfig.firestoreDatabaseId || '(default)';

  const markPermissionDenied = useCallback(() => {
    setHasPermissionError(true);
  }, []);

  const markPermissionGranted = useCallback(() => {
    setHasPermissionError(false);
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      // Test read to see if security rules allow reading
      await getDoc(doc(db, 'settings', 'general'));
      setHasPermissionError(false);
      setIsChecking(false);
      return true;
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        setHasPermissionError(true);
      }
      setIsChecking(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const dismissBanner = () => setIsBannerDismissed(true);
  const showBanner = () => setIsBannerDismissed(false);

  return (
    <FirestoreStatusContext.Provider
      value={{
        hasPermissionError,
        projectId,
        databaseId,
        rulesCode: FIRESTORE_RULES_SOURCE,
        isChecking,
        isBannerDismissed,
        checkConnection,
        dismissBanner,
        showBanner,
        markPermissionDenied,
        markPermissionGranted,
      }}
    >
      {children}
    </FirestoreStatusContext.Provider>
  );
}

export function useFirestoreStatus() {
  const context = useContext(FirestoreStatusContext);
  if (!context) {
    throw new Error('useFirestoreStatus must be used within a FirestoreStatusProvider');
  }
  return context;
}
