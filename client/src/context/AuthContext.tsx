import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE, authenticatedFetch } from '../config';

export interface User {
  id: string;
  email: string;
  username?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithFirebase: (idToken: string) => Promise<void>;
  checkGoogleRegistration: (
    idToken: string
  ) => Promise<{ isRegistered: boolean; username?: string; email?: string }>;
  registerWithGoogle: (
    idToken: string,
    username: string,
    password: string
  ) => Promise<void>;
  loginWithGoogle: (
    idToken: string,
    username: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getErrorMessage = async (
  response: Response,
  defaultMessage: string
): Promise<string> => {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return data.error || defaultMessage;
    }
    const text = await response.text();
    if (text && (text.includes('<!DOCTYPE') || text.includes('<html'))) {
      return `${response.status} ${response.statusText || 'Error'}`;
    }
    return text || `${response.status} ${response.statusText || 'Error'}`;
  } catch {
    return defaultMessage;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Exposes whether user is authenticated based on presence of user object
  const isAuthenticated = !!user;

  const clearError = () => setError(null);

  // Check login session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        if (urlToken) {
          localStorage.setItem('inboxos_token', urlToken);
          const newUrl =
            window.location.pathname +
            window.location.search
              .replace(/[?&]token=[^&]+/, '')
              .replace(/^&/, '?');
          window.history.replaceState({}, document.title, newUrl);
        }

        const response = await authenticatedFetch(`${API_BASE}/api/auth/me`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser({
              id: data.user.userId,
              email: data.user.email,
              username: data.user.username || undefined,
            });
          }
        }
      } catch (err) {
        console.warn(
          '[AuthContext] Could not reach backend to verify session. Falling back to mock user in dev.'
        );
        setUser({
          id: 'demo-id',
          email: 'demo-user@inboxos.dev',
          username: 'demo-user',
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorMsg = await getErrorMessage(response, 'Invalid credentials');
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('inboxos_token', data.token);
      }
      setUser({
        id: data.user.id,
        email: data.user.email,
      });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorMsg = await getErrorMessage(response, 'Registration failed');
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('inboxos_token', data.token);
      }
      setUser({
        id: data.user.id,
        email: data.user.email,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithFirebase = async (idToken: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/firebase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorMsg = await getErrorMessage(
          response,
          'Firebase authentication failed'
        );
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('inboxos_token', data.token);
      }
      const authenticatedUser = {
        id: data.user.id,
        email: data.user.email,
      };

      setUser(authenticatedUser);
      localStorage.setItem('inboxos_user', JSON.stringify(authenticatedUser));
    } catch (err: any) {
      console.error('[AuthContext] Firebase Login failed:', err);
      setError(err.message || 'Firebase login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const checkGoogleRegistration = async (idToken: string) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/auth/google/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorMsg = await getErrorMessage(response, 'Check failed');
        throw new Error(errorMsg);
      }
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const registerWithGoogle = async (
    idToken: string,
    username: string,
    password: string
  ) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/google/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, username, password }),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorMsg = await getErrorMessage(
          response,
          'Google registration failed'
        );
        throw new Error(errorMsg);
      }
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('inboxos_token', data.token);
      }
      const authenticatedUser = {
        id: data.user.id,
        email: data.user.email,
        username: data.user.username,
      };
      setUser(authenticatedUser);
      localStorage.setItem('inboxos_user', JSON.stringify(authenticatedUser));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (
    idToken: string,
    username: string,
    password: string
  ) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/google/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, username, password }),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorMsg = await getErrorMessage(response, 'Google login failed');
        throw new Error(errorMsg);
      }
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('inboxos_token', data.token);
      }
      const authenticatedUser = {
        id: data.user.id,
        email: data.user.email,
        username: data.user.username,
      };
      setUser(authenticatedUser);
      localStorage.setItem('inboxos_user', JSON.stringify(authenticatedUser));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authenticatedFetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
      });
    } catch (err) {
      console.warn('[AuthContext] Failed to call logout endpoint on backend.');
    } finally {
      setUser(null);
      localStorage.removeItem('inboxos_token');
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        login,
        register,
        loginWithFirebase,
        checkGoogleRegistration,
        registerWithGoogle,
        loginWithGoogle,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
