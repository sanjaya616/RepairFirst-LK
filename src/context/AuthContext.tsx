import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

const BOOTSTRAPPED_ADMIN_EMAIL = 'sanjayalasnan327@gmail.com';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const syncUserProfile = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userRef);
      const isBootstrappedAdmin = user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

      if (snap.exists()) {
        const data = snap.data();
        const role = isBootstrappedAdmin ? 'admin' : (data.role || 'customer');
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || data.displayName || 'User',
          role: role,
          createdAt: data.createdAt || new Date().toISOString(),
        };
        setUserProfile(profile);
        setIsAdmin(profile.role === 'admin' || isBootstrappedAdmin);
      } else {
        const role = isBootstrappedAdmin ? 'admin' : 'customer';
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          role: role,
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, {
          email: newProfile.email,
          displayName: newProfile.displayName,
          role: newProfile.role,
          createdAt: newProfile.createdAt,
        });
        setUserProfile(newProfile);
        setIsAdmin(role === 'admin');
      }
    } catch (err) {
      console.warn('Failed to fetch/sync user profile from Firestore:', err);
      // Fallback in-memory profile if Firestore permissions or offline
      const isBootstrappedAdmin = user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
      setUserProfile({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        role: isBootstrappedAdmin ? 'admin' : 'customer',
        createdAt: new Date().toISOString(),
      });
      setIsAdmin(isBootstrappedAdmin);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncUserProfile(user);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch (err) {
      console.error('Error getting ID token:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await syncUserProfile(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAdmin,
        isLoading,
        signInWithGoogle,
        signOutUser,
        getIdToken,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
