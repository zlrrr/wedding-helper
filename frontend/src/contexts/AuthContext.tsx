// Wedding Helper - Authentication Context
// React context for managing authentication state

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import type { User, AuthResponse } from '../types';
import { logger } from '../utils/logger';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (authApi.isAuthenticated()) {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
          logger.info('[Auth] User authenticated', { username: currentUser.username });
        }
      } catch (error) {
        logger.error('[Auth] Failed to get current user', error);
        // Token might be invalid, clear it
        await authApi.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Login
   */
  const login = useCallback(async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response: AuthResponse = await authApi.login(username, password);
      setUser(response.user);
      logger.info('[Auth] Login successful', { username });
    } catch (error) {
      logger.error('[Auth] Login failed', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register
   */
  const register = useCallback(async (username: string, password: string, inviteCode?: string) => {
    try {
      setIsLoading(true);
      const response: AuthResponse = await authApi.register(username, password, inviteCode);
      setUser(response.user);
      logger.info('[Auth] Registration successful', { username });
    } catch (error) {
      logger.error('[Auth] Registration failed', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
      setUser(null);
      logger.info('[Auth] Logout successful');
    } catch (error) {
      logger.error('[Auth] Logout failed', error);
      // Still clear user state even if API call fails
      setUser(null);
    }
  }, []);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      logger.info('[Auth] User data refreshed');
    } catch (error) {
      logger.error('[Auth] Failed to refresh user data', error);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth hook
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
