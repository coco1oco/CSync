import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Ban, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/authContext";

export default function Unauthorized() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // ✅ Check if the user is banned (using our new timestamp logic)
  const isBanned = !!user?.banned_at;

  const handleSignOut = async () => {
    await signOut();
    navigate("/SignIn");
  };

  // === VIEW 1: BANNED USER ===
  if (isBanned) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-red-50 p-6">
        <div className="w-full max-w-md text-center space-y-6">
          {/* Banned Icon */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-100 mb-2 animate-in zoom-in duration-300">
            <Ban className="h-12 w-12 text-red-600" />
          </div>

          {/* Banned Message */}
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-red-900 tracking-tight">
              Account Suspended
            </h1>
            <p className="text-red-800/80 text-sm leading-relaxed font-medium">
              Your account has been banned due to policy violations.
              <br className="hidden sm:block" />
              Please contact{" "}
              <span className="font-bold">YFA Administration</span> for
              assistance or to appeal this decision.
            </p>
          </div>

          {/* Action: Sign Out Only (No 'Go Home' allowed) */}
          <Button
            onClick={handleSignOut}
            className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-200 transition-all active:scale-95"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // === VIEW 2: REGULAR UNAUTHORIZED (Admin Only Page) ===
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Warning Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <ShieldAlert className="h-10 w-10 text-amber-600" />
        </div>

        {/* Access Denied Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Access Denied
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Sorry, you don't have permission to view this page. This area is
            restricted to administrators only.
          </p>
        </div>

        {/* Action Button: Go Home */}
        <Button
          asChild
          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition-all active:scale-95"
        >
          <Link to="/">Go back to Home</Link>
        </Button>

        {/* Alternative Link */}
        <div className="mt-4">
          <button
            onClick={handleSignOut}
            className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Switch Account
          </button>
        </div>
      </div>
    </div>
  );
}
