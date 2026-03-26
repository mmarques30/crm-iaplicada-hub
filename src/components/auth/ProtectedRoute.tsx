import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AppModule = 'dashboard' | 'pipeline' | 'contacts' | 'comercial' | 'financeiro' | 'analytics' | 'email' | 'forms' | 'tasks' | 'instagram' | 'settings' | 'admin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: AppModule;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, module, requireAdmin }: ProtectedRouteProps) {
  const { user, loading, hasAccess, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  if (module && !hasAccess(module)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
