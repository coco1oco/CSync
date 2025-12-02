// routes/ProtectedRoute.tsx

import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";

// Reusable wrapper for any route that should only be accessible
// when the user is authenticated (and optionally has a specific role).
export const ProtectedRoute = ({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  // If provided, only users with this role can access the route.
  // If omitted, any logged‑in user is allowed.
  requiredRole?: "user" | "admin";
}) => {
  // Get current auth state from your AuthContext
  const { user, loading } = useAuth();

  // While auth state is still being resolved (e.g., checking Supabase session),
  // render a full‑screen loading UI instead of the protected content.
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // If there is no authenticated user after loading finishes,
  // redirect to the Welcome page instead of SignIn.
  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  // If this route requires a specific role and the logged‑in user
  // does not have that role, redirect to an Unauthorized page.
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/Unauthorized" replace />;
  }

  // If we reach this point:
  // - loading is false
  // - user exists
  // - and either no requiredRole was specified, or the user has that role
  // → render the protected children.
  return <>{children}</>;
};
