import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, authApi, type User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = api.getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    const response = await authApi.me();
    if (response.success && response.data) {
      setUser(response.data);
    } else {
      api.setToken(null);
    }
    setIsLoading(false);
  }

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password);
    if (response.success && response.data) {
      api.setToken(response.data.token);
      // Fetch full user data including roles
      const meResponse = await authApi.me();
      if (meResponse.success && meResponse.data) {
        setUser(meResponse.data);
      } else {
        setUser(response.data.user);
      }
      return { success: true };
    }
    return { success: false, error: response.error?.message || 'Login failed' };
  }

  async function logout() {
    await authApi.logout();
    api.setToken(null);
    setUser(null);
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.roles?.includes('ADMIN') ?? false,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
