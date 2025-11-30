// src/components/ProtectedRoute.tsx
import { useAuth } from "@/context/authContext";  // Import your auth context
import { Navigate } from "react-router-dom";

// This component wraps pages that require login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();  // Get user from AuthContext
  
  if (loading) return <div className="flex items-center justify-center h-screen">Nigga</div>;  // Check 1: Is data still loading?
  if (!user) return <Navigate to="/SignIn" />;  // Check 2: Is user logged in?
  
  return <>{children}</>;  // Check 3: Yes? Show the page!
}

export default ProtectedRoute;
