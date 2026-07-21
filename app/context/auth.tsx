import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

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

  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = await SecureStore.getItemAsync('user_token');
        const storedUser = await SecureStore.getItemAsync('user_profile');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to load stored auth session:', e);
      } finally {
        setLoading(false);
      }
    }
    loadStoredAuth();
  }, []);

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
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync('user_token');
    await SecureStore.deleteItemAsync('user_profile');
    // Allow router reset to signin
    router.replace('/signin');
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
