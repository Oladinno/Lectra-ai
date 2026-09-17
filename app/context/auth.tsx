import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/expo';

export interface User {
  id: string;
  email: string;
  created_at: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signUp: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const { isSignedIn, getToken, signOut: clerkSignOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        if (isSignedIn) {
          const clerkToken = await getToken();
          if (clerkToken) {
            setToken(clerkToken);
            setUser({
              id: clerkUser?.id || '',
              email: clerkUser?.primaryEmailAddress?.emailAddress || '',
              created_at: clerkUser?.createdAt ? new Date(clerkUser.createdAt).toISOString() : new Date().toISOString(),
            });
            setLoading(false);
            return;
          }
        }

        const storedToken = await SecureStore.getItemAsync('user_token');
        const storedUser = await SecureStore.getItemAsync('user_profile');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else {
          setToken(null);
          setUser(null);
        }
      } catch (e) {
        console.error('Failed to load stored auth session:', e);
      } finally {
        setLoading(false);
      }
    }
    loadStoredAuth();
  }, [isSignedIn, clerkUser]);

  const signIn = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    await SecureStore.setItemAsync('user_token', newToken);
    await SecureStore.setItemAsync('user_profile', JSON.stringify(newUser));
  };

  const signUp = async (newToken: string, newUser: User) => {
    await signIn(newToken, newUser);
  };

  const signOut = async () => {
    if (isSignedIn) {
      await clerkSignOut();
    }
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync('user_token');
    await SecureStore.deleteItemAsync('user_profile');
    router.replace('/(auth)/signin');
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, signIn, signUp, signOut }}>
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

// Required by expo-router for files inside the app/ directory
export default AuthProvider;
