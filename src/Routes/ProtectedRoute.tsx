// routes/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import type { JSX } from "react";

interface Props {
  children: JSX.Element;
  role?: "admin" | "user";
}

export const ProtectedRoute = ({ children, role }: Props) => {
  const { user, role: userRole } = useAuth(); // ✅ destructure both user & role

  // If not logged in → go to login page
  if (!user) return <Navigate to="/SignIn" replace />;

  // If role mismatch → redirect
  if (role && userRole !== role) {
    return userRole === "admin" ? (
      <Navigate to="/admin-login-9274" replace />
    ) : (
      <Navigate to="/SignIn" replace />
    );
  }

  return children;
};
