import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, authApi, type User, type TeamMembership } from '@/lib/api';

const ACTIVE_TEAM_KEY = 'doublezero_active_team';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeamAdmin: boolean;
  teamMemberships: TeamMembership[];
  activeTeam: TeamMembership | null;
  setActiveTeam: (team: TeamMembership | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTeamId, setActiveTeamId] = useState<number | null>(() => {
    const stored = localStorage.getItem(ACTIVE_TEAM_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

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

  const teamMemberships = user?.teamMemberships ?? [];
  const isTeamAdmin = teamMemberships.some(m => m.permission === 'ADMIN');

  // Derive activeTeam from activeTeamId and teamMemberships
  // Auto-select first team if user has teams but no selection yet
  const activeTeam = (() => {
    if (teamMemberships.length === 0) return null;
    
    // If we have a stored activeTeamId, try to find it
    if (activeTeamId) {
      const found = teamMemberships.find(m => m.teamId === activeTeamId);
      if (found) return found;
    }
    
    // Auto-default to first team (always have an active team if on any team)
    return teamMemberships[0];
  })();

  // Auto-persist the first team selection if not already stored
  useEffect(() => {
    if (teamMemberships.length > 0 && !activeTeamId) {
      const firstTeam = teamMemberships[0];
      setActiveTeamId(firstTeam.teamId);
      localStorage.setItem(ACTIVE_TEAM_KEY, firstTeam.teamId.toString());
    }
  }, [teamMemberships, activeTeamId]);

  function setActiveTeam(team: TeamMembership | null) {
    if (team) {
      setActiveTeamId(team.teamId);
      localStorage.setItem(ACTIVE_TEAM_KEY, team.teamId.toString());
    } else {
      setActiveTeamId(null);
      localStorage.removeItem(ACTIVE_TEAM_KEY);
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.roles?.includes('ADMIN') ?? false,
    isTeamAdmin,
    teamMemberships,
    activeTeam,
    setActiveTeam,
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
