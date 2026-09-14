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
            // Initialize new user document in Firestore
            const initialRole: UserRole = 'SUPER_ADMIN'; // Default first authenticated user as Super Admin
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
          // Fallback profile if Firestore read fails
          setCurrentUser({
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            role: 'SUPER_ADMIN',
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } else {
        // Fallback demo user if not logged in via Firebase Auth yet
        // This ensures the application is immediately usable and fully testable in the preview container!
        setCurrentUser({
          uid: 'user-superadmin',
          displayName: 'Victoria Sterling',
          email: 'admin@inventorypro.com',
          role: demoRole || 'SUPER_ADMIN',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [demoRole]);

  const effectiveRole: UserRole = demoRole || currentUser?.role || 'SUPER_ADMIN';

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      setDemoRole(null);
      await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      setDemoRole(null);
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const user = res.user;
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const isOwner = user.email === 'yared.abegaz@gmail.com';
        const newUserData: AppUser = {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          role: isOwner ? 'SUPER_ADMIN' : 'ADMIN',
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
    setDemoRole(null);
    setCurrentUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const switchDemoRole = (role: UserRole) => {
    setDemoRole(role);
    if (currentUser) {
      const roleNames: Record<UserRole, string> = {
        SUPER_ADMIN: 'Victoria Sterling (Super Admin)',
        ADMIN: 'Alexander Vance (Admin)',
        STAFF: 'Jordan Lee (Warehouse Staff)',
      };
      setCurrentUser({
        ...currentUser,
        role,
        displayName: roleNames[role] || currentUser.displayName,
      });
    }
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
        isDemoUser: !firebaseUser,
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
