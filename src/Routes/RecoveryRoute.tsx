// src/Routes/RecoveryRoute.tsx
// Guards the /reset-password route — only accessible when the session
// was created via a Supabase password-reset magic link (PASSWORD_RECOVERY event).
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { Loader2 } from "lucide-react";

export const RecoveryRoute = ({ children }: { children: React.ReactNode }) => {
  const { isRecoveryMode, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-gray-500">Verifying link...</p>
      </div>
    );
  }

  // If the user didn't arrive via a valid reset link, send them to ForgotPassword
  if (!isRecoveryMode) {
    return <Navigate to="/ForgotPassword" replace />;
  }

  return <>{children}</>;
};
