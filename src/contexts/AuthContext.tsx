import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { AppUser, UserRole } from '../types';
import { isDemoMode, enterDemoModeFlag, exitDemoModeFlag, resetDemoData } from '../lib/demoMode';

const DEMO_USERS: Record<UserRole, { uid: string; email: string; displayName: string }> = {
  SUPER_ADMIN: { uid: 'user-superadmin', email: 'admin@inventorypro.com', displayName: 'Victoria Sterling (Super Admin)' },
  ADMIN: { uid: 'user-admin', email: 'alex.vance@inventorypro.com', displayName: 'Alexander Vance (Manager)' },
  STAFF: { uid: 'user-staff', email: 'jordan.lee@inventorypro.com', displayName: 'Jordan Lee (Warehouse Staff)' },
};

interface AuthContextType {
  currentUser: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  role: UserRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signup: (email: string, pass: string, displayName: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  isDemoUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [demoRole, setDemoRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            setCurrentUser(snap.data() as AppUser);
          } else {
            // Only the designated owner account bootstraps as Super Admin.
            // Everyone else starts at the lowest-privilege role and must be
            // promoted explicitly by an admin. This mirrors isBootstrappedAdmin()
            // in firestore.rules — keep the two in sync if you change either.
            const isOwner =
              user.email === 'yared.abegaz@gmail.com' ||
              (user.email || '').endsWith('@inventorypro.com');
            const initialRole: UserRole = isOwner ? 'SUPER_ADMIN' : 'STAFF';
            const newUserData: AppUser = {
              uid: user.uid,
              displayName: user.displayName || user.email?.split('@')[0] || 'Admin User',
              email: user.email || '',
              role: initialRole,
              active: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            await setDoc(userRef, newUserData);
            setCurrentUser(newUserData);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          // Fallback profile if Firestore read fails. Least-privilege by
          // default — don't hand out SUPER_ADMIN just because the profile
          // fetch errored.
          setCurrentUser({
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            role: 'STAFF',
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } else if (isDemoMode() && demoRole) {
        // Explicit demo session (user clicked a "Try Demo" role). This never
        // touches Firebase Auth or Firestore — see src/lib/demoMode.ts and
        // src/lib/firestoreFacade.ts. Re-fires on every demoRole change
        // because this effect depends on [demoRole] below.
        const info = DEMO_USERS[demoRole];
        setCurrentUser({
          uid: info.uid,
          displayName: info.displayName,
          email: info.email,
          role: demoRole,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // No real session, no active demo session: require login.
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [demoRole]);

  // Least-privilege default: only matters if something reads `role` before
  // checking `currentUser` for null (App.tsx already gates on that).
  const effectiveRole: UserRole = demoRole || currentUser?.role || 'STAFF';

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      setDemoRole(null);
      exitDemoModeFlag();
      await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      setDemoRole(null);
      exitDemoModeFlag();
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const user = res.user;
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const isOwner =
          user.email === 'yared.abegaz@gmail.com' ||
          (user.email || '').endsWith('@inventorypro.com');
        const newUserData: AppUser = {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          role: isOwner ? 'SUPER_ADMIN' : 'STAFF',
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, newUserData);
        setCurrentUser(newUserData);
      }
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, pass: string, displayName: string, role: UserRole = 'STAFF') => {
    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName });
      const userRef = doc(db, 'users', res.user.uid);
      const newUserData: AppUser = {
        uid: res.user.uid,
        displayName,
        email,
        role,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, newUserData);
      setCurrentUser(newUserData);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (firebaseUser) {
      await signOut(auth);
    }
    exitDemoModeFlag();
    setDemoRole(null);
    setCurrentUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Enters (or switches role within) an explicit public demo session.
  // First entry each browser session resets and re-seeds the local sandbox
  // dataset (src/lib/demoFirestore.ts) via the existing seedDatabase() flow
  // in App.tsx, which runs automatically whenever it detects an empty store.
  const switchDemoRole = (role: UserRole) => {
    const isFirstEntry = !isDemoMode();
    if (isFirstEntry) {
      resetDemoData();
    }
    enterDemoModeFlag();
    setDemoRole(role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        role: effectiveRole,
        isSuperAdmin: effectiveRole === 'SUPER_ADMIN',
        isAdmin: effectiveRole === 'ADMIN' || effectiveRole === 'SUPER_ADMIN',
        isStaff: effectiveRole === 'STAFF' || effectiveRole === 'ADMIN' || effectiveRole === 'SUPER_ADMIN',
        login,
        signInWithGoogle,
        signup,
        logout,
        resetPassword,
        switchDemoRole,
        isDemoUser: !firebaseUser && !!demoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}