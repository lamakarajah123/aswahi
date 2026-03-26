import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShieldAlert, LogIn, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermissions,
  fallback,
}: ProtectedRouteProps) {
  const { user, loading, roles, permissions } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center p-8">
          <LogIn className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
          <p className="text-gray-500 mb-4">Please sign in to access this page</p>
          <Button onClick={() => navigate('/login')} className="bg-green-600 hover:bg-green-700 text-white">
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  // Check roles
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((r) => roles.includes(r));
    if (!hasRequiredRole) {
      if (fallback) return <>{fallback}</>;
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full text-center p-8">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-500 mb-2">
              You don't have permission to access this page.
            </p>
            <p className="text-xs text-gray-400">
              Required role: {requiredRoles.join(' or ')}
            </p>
          </Card>
        </div>
      );
    }
  }

  // Check permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPerm = requiredPermissions.every((p) => permissions.includes(p));
    if (!hasRequiredPerm) {
      if (fallback) return <>{fallback}</>;
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full text-center p-8">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-500 mb-2">
              You don't have the required permissions.
            </p>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
}