'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthSession } from '@/types';

interface AuthContextType {
  session: AuthSession | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  login: (usernameOrKey: string, password?: string) => Promise<{ success: boolean; error?: string; is_concurrent_locked?: boolean; session?: AuthSession }>;
  register: (name: string, username: string, password: string, plan_type?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Validate or restore session
  const refreshSession = useCallback(async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('wsp_session_token') : null;
      if (!storedToken) {
        setSession(null);
        setLoading(false);
        return;
      }

      const res = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'x-session-token': storedToken
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.session) {
          setSession(data.session);
          if (typeof window !== 'undefined') {
            localStorage.setItem('wsp_auth_user', JSON.stringify(data.session));
          }
        } else {
          setSession(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('wsp_session_token');
            localStorage.removeItem('wsp_auth_user');
          }
        }
      } else {
        setSession(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('wsp_session_token');
          localStorage.removeItem('wsp_auth_user');
        }
      }
    } catch (err) {
      console.warn('Session verification error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Periodic heartbeat every 45s to maintain active origin binding
  useEffect(() => {
    if (!session?.session_token) return;

    const interval = setInterval(async () => {
      try {
        await fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session_token}`
          },
          body: JSON.stringify({ session_token: session.session_token })
        });
      } catch (err) {
        console.warn('Heartbeat ping failed:', err);
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [session?.session_token]);

  const login = async (usernameOrKey: string, password?: string) => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrKey, password, origin })
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Authentication failed',
          is_concurrent_locked: !!data.is_concurrent_locked
        };
      }

      if (data.success && data.session) {
        setSession(data.session);
        if (typeof window !== 'undefined') {
          localStorage.setItem('wsp_session_token', data.session.session_token);
          localStorage.setItem('wsp_auth_user', JSON.stringify(data.session));
        }
        setIsLoginModalOpen(false);
        return { success: true, session: data.session };
      }

      return { success: false, error: 'Unexpected login response' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const register = async (name: string, username: string, password: string, plan_type = 'monthly') => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, password, plan_type, origin })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      if (data.success && data.session) {
        setSession(data.session);
        if (typeof window !== 'undefined') {
          localStorage.setItem('wsp_session_token', data.session.session_token);
          localStorage.setItem('wsp_auth_user', JSON.stringify(data.session));
        }
        setIsLoginModalOpen(false);
        return { success: true };
      }

      return { success: false, error: 'Registration incomplete' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration network error' };
    }
  };

  const logout = async () => {
    try {
      if (session?.session_token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session_token}`
          },
          body: JSON.stringify({ session_token: session.session_token })
        });
      }
    } catch (err) {
      console.warn('Logout notification error:', err);
    } finally {
      setSession(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wsp_session_token');
        localStorage.removeItem('wsp_auth_user');
      }
      setIsLoginModalOpen(true);
    }
  };

  const isAdmin = session?.role === 'admin';
  const isAuthenticated = !!session;

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        isAdmin,
        isAuthenticated,
        login,
        register,
        logout,
        refreshSession,
        isLoginModalOpen,
        setIsLoginModalOpen
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
