// src/Routes/PublicRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { Loader2 } from "lucide-react";

export const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-gray-500">Checking session...</p>
      </div>
    );
  }

  // If user IS logged in, send them straight to the Dashboard (Home)
  if (user) {
    return <Navigate to="/" replace />;
  }

  // Otherwise, let them see the public page (SignIn, Welcome, etc.)
  return <>{children}</>;
};
