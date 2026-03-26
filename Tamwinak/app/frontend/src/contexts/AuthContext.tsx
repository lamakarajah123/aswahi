import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { authApi } from '../lib/auth';
import { apiCall } from '../lib/axios';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  last_login?: string;
}

interface RBACInfo {
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
  loginSSO: () => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStoreOwner: boolean;
  isDriver: boolean;
  isCustomer: boolean;
  roles: string[];
  permissions: string[];
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rbac, setRbac] = useState<RBACInfo>({ roles: [], permissions: [] });

  const fetchRBACInfo = useCallback(async () => {
    try {
      const res = await apiCall.invoke({
        url: '/api/v1/rbac/me',
        method: 'GET',
      });
      if (res.data) {
        setRbac({
          roles: res.data.roles || [],
          permissions: res.data.permissions || [],
        });
      }
    } catch {
      // User might not have any roles yet
      setRbac({ roles: [], permissions: [] });
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await authApi.getCurrentUser();
      setUser(userData ?? null);
      if (userData) {
        await fetchRBACInfo();
      }
    } catch {
      // Network / unexpected error → treat as logged out, don't crash
      setUser(null);
      setRbac({ roles: [], permissions: [] });
    } finally {
      setLoading(false);
    }
  }, [fetchRBACInfo]);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authApi.loginWithPassword(email, password);

      // Set user from login response
      setUser(response.user as User);

      // Set RBAC from login response
      setRbac({
        roles: response.roles || [],
        permissions: response.permissions || [],
      });
    } catch (err: any) {
      const message =
        err?.data?.detail ||
        err?.response?.data?.detail ||
        err?.message ||
        'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginSSO = useCallback(async () => {
    try {
      setError(null);
      await authApi.loginSSO();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }, []);

  const loginWithFacebook = useCallback(async (accessToken: string) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authApi.loginWithFacebook(accessToken);
      setUser(response.user as User);
      setRbac({
        roles: response.roles || [],
        permissions: (response as any).permissions || [],
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Facebook login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setError(null);
      setRbac({ roles: [], permissions: [] });
      setUser(null);
      await authApi.logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();

    const handleUnauthorized = () => {
      setUser(null);
      setRbac({ roles: [], permissions: [] });
      const path = window.location.pathname;
      const PUBLIC_PATHS = ['/', '/login', '/signup'];
      const isPublicPath =
        PUBLIC_PATHS.includes(path) ||
        path.startsWith('/category/') ||
        path.startsWith('/store/');
      if (!isPublicPath) {
        window.location.href = '/login';
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const hasRole = useCallback((role: string) => rbac.roles.includes(role), [rbac.roles]);
  const hasPermission = useCallback((permission: string) => rbac.permissions.includes(permission), [rbac.permissions]);
  const hasAnyRole = useCallback((roles: string[]) => roles.some((r) => rbac.roles.includes(r)), [rbac.roles]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    error,
    loginWithPassword,
    loginWithFacebook,
    loginSSO,
    logout,
    refetch: checkAuthStatus,
    isAdmin: hasRole('admin') || hasRole('super_admin') || user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: hasRole('super_admin') || user?.role === 'super_admin',
    isStoreOwner: hasRole('store_owner') || user?.role === 'store_owner',
    isDriver: hasRole('driver') || user?.role === 'driver',
    isCustomer: hasRole('customer') || (rbac.roles.length === 0 && user?.role === 'customer') || (!user?.role && rbac.roles.length === 0),
    roles: rbac.roles,
    permissions: rbac.permissions,
    hasRole,
    hasPermission,
    hasAnyRole,
  }), [user, loading, error, rbac, loginWithPassword, loginWithFacebook, loginSSO, logout, checkAuthStatus, hasRole, hasPermission, hasAnyRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};