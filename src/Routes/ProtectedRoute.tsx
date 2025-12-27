import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import LoadingSpinner from "../components/LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "user";
}

// ✅ FIX: Changed to named export 'export const ProtectedRoute'
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, loading } = useAuth();

  // 1. Wait for Auth to load
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // 2. Check if User is Logged In
  if (!user) {
    return <Navigate to="/SignIn" replace />;
  }

  // 3. Security Check: Banned
  if (user.banned_at || user.role === ("banned" as any)) {
    return <Navigate to="/unauthorized" replace />;
  }
  // 4. Security Check: Soft Deleted
  if (user.deleted_at) {
    return <Navigate to="/SignIn" replace />;
  }

  // 5. Role Based Access Control
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 6. Render the content
  return <>{children}</>;
};
