import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import appletConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || appletConfig.apiKey || "AIzaSyDE7ySVVZpkJRm648cEIbKEE332NtXBVXc",
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || appletConfig.authDomain || "inventory-management-49722.firebaseapp.com",
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || appletConfig.projectId || "inventory-management-49722",
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || appletConfig.storageBucket || "inventory-management-49722.firebasestorage.app",
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || appletConfig.messagingSenderId || "909780272612",
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || appletConfig.appId || "1:909780272612:web:aef24090218d762fad73f1",
};

const rawDatabaseId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_DATABASE_ID) || appletConfig.firestoreDatabaseId;
// If database ID is (default), default, empty, or omitted, use the standard default database
const isNamedDatabase = Boolean(
  rawDatabaseId &&
  rawDatabaseId !== '(default)' &&
  rawDatabaseId !== 'default' &&
  rawDatabaseId.trim() !== ''
);

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = isNamedDatabase ? getFirestore(app, rawDatabaseId) : getFirestore(app);
export const storage = getStorage(app);

// Connection check as required by Firebase skill
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'settings', 'general'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore is offline or still initializing.');
    }
    return false;
  }
}
