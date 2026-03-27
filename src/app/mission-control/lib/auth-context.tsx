'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase-config';

// Role definitions
// ADMIN: Full read/write access (Josh + Claude)
// ANALYST: Read + download, can add notebook entries
// OBSERVER: Read-only, can download evidence
export type UserRole = 'admin' | 'analyst' | 'observer';

interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  invitedBy: string;
  invitedAt: string;
  lastLogin: string;
  active: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  canWrite: boolean;
  canDownload: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  login: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  isAdmin: false,
  canWrite: false,
  canDownload: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user profile via Firestore REST API (bypasses SDK offline issue)
        try {
          const token = await firebaseUser.getIdToken();
          const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
          const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/default/documents/mission-control-users/${firebaseUser.uid}`;
          const resp = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (resp.ok) {
            const doc = await resp.json();
            const fields = doc.fields || {};
            const data: UserProfile = {
              uid: fields.uid?.stringValue || firebaseUser.uid,
              email: fields.email?.stringValue || firebaseUser.email || '',
              role: (fields.role?.stringValue || 'observer') as UserRole,
              displayName: fields.displayName?.stringValue || firebaseUser.displayName || '',
              invitedBy: fields.invitedBy?.stringValue || '',
              invitedAt: fields.invitedAt?.stringValue || '',
              lastLogin: fields.lastLogin?.stringValue || '',
              active: fields.active?.booleanValue ?? false,
            };
            if (!data.active) {
              await signOut(auth);
              setError('Account has been deactivated. Contact the administrator.');
              setProfile(null);
            } else {
              setProfile(data);
              setError(null);
            }
          } else if (resp.status === 404) {
            await signOut(auth);
            setError('Access denied. This system is invite-only.');
            setProfile(null);
          } else {
            const errData = await resp.json().catch(() => ({}));
            throw new Error(errData.error?.message || `HTTP ${resp.status}`);
          }
        } catch (err: any) {
          console.error('Error fetching profile:', err);
          setError(`Error loading profile: ${err?.message || err}`);
          await signOut(auth);
          setProfile(null);
        }
      } else {
        setProfile(null);
        setError(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid credentials.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Try again later.');
      } else {
        setError('Authentication failed.');
      }
      setLoading(false);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        // User cancelled
      } else {
        setError(`Google sign-in failed: ${err?.message || err}`);
      }
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin';
  const canWrite = profile?.role === 'admin';
  const canDownload = profile?.role !== undefined; // All authenticated users can download

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, login, loginWithGoogle, logout, isAdmin, canWrite, canDownload }}>
      {children}
    </AuthContext.Provider>
  );
}
