import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { setApiAuthToken, api } from '../services/api.ts';

export interface AppUserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'storekeeper';
}

interface AuthContextType {
  user: AppUserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (role: 'admin' | 'storekeeper') => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async () => {
    try {
      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
      }
    } catch (err: any) {
      console.warn('Profile fetch note:', err.message);
    }
  };

  useEffect(() => {
    // Check local storage for existing session
    const savedToken = localStorage.getItem('secustock_auth_token');
    const savedUserJson = localStorage.getItem('secustock_user_profile');

    if (savedToken) {
      setApiAuthToken(savedToken);
      if (savedUserJson) {
        try {
          setUser(JSON.parse(savedUserJson));
        } catch (_) {}
      }
      fetchUserProfile().finally(() => setLoading(false));
    } else {
      // Default to demo admin on first boot for smooth immediate exploration
      loginAsDemo('admin').finally(() => setLoading(false));
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          setApiAuthToken(token);
          localStorage.setItem('secustock_auth_token', token);
          await fetchUserProfile();
        } catch (err: any) {
          console.error('Error handling Firebase Auth state:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      setApiAuthToken(token);
      localStorage.setItem('secustock_auth_token', token);
      await fetchUserProfile();
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      setError(err.message || 'Échec de connexion avec Google');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async (role: 'admin' | 'storekeeper') => {
    setError(null);
    setLoading(true);
    try {
      const email = role === 'admin' ? 'directeur.admin@secustock.ci' : 'magasinier.chef@secustock.ci';
      const name = role === 'admin' ? 'Directeur Sécurité (Admin)' : 'Magasinier Principal';
      const uid = `demo-${role}-001`;
      const token = `demo-user:${uid}:${email}:${name}`;

      setApiAuthToken(token);
      localStorage.setItem('secustock_auth_token', token);

      const res = await api.getMe();
      if (res && res.user) {
        // Enforce the requested role
        if (res.user.role !== role) {
          try {
            await api.updateUserRole(res.user.id, role);
            res.user.role = role;
          } catch (_) {}
        }
        setUser(res.user);
        localStorage.setItem('secustock_user_profile', JSON.stringify(res.user));
      }
    } catch (err: any) {
      console.error('Demo login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (_) {}
    localStorage.removeItem('secustock_auth_token');
    localStorage.removeItem('secustock_user_profile');
    setUser(null);
    setFirebaseUser(null);
    setApiAuthToken('');
  };

  const refreshProfile = async () => {
    await fetchUserProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        error,
        loginWithGoogle,
        loginAsDemo,
        logout,
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
