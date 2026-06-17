import { createContext, useContext, useState, type ReactNode } from 'react';
import { api, ADMIN_KEY, REFRESH_KEY, TOKEN_KEY, type ApiResponse } from './api';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role?: string;
}

interface LoginResponse {
  admin: AdminUser;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAdmin(): AdminUser | null {
  const raw = localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}

/** Standalone role readers (usable in router beforeLoad guards, outside React). */
export function currentAdminRole(): string | undefined {
  return readStoredAdmin()?.role;
}
export function isSuperAdmin(): boolean {
  return currentAdminRole() === 'super_admin';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(readStoredAdmin);

  const login = async (email: string, password: string) => {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/admin/login', {
      email,
      password,
    });
    const { admin: user, accessToken, refreshToken } = res.data.data;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(user));
    setAdmin(user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ADMIN_KEY);
    setAdmin(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated: !!admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
