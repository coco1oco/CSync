import { Link, useNavigate } from "react-router-dom";
import { useState } from "react"; // ✅ Import useState
import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react"; // ✅ Import Loader2
import FailedImageIcon from "@/assets/FailedImage.svg";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false); // ✅ Local loading state

  const handleSignOut = async () => {
    setIsSigningOut(true); // ✅ Show loading immediately
    try {
      await signOut();
      navigate("/SignIn");
    } catch (error) {
      console.error("Error signing out:", error);
      setIsSigningOut(false);
    }
  };

  if (!user) return null;

  // Check if profile is complete
  const needsCompletion = !user.first_name || !user.last_name;

  return (
    <div className="space-y-6 pb-20 pt-6 px-4">
      {/* Page Title */}
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Banner if incomplete */}
      {needsCompletion && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-100 px-4 py-3 text-sm text-yellow-800 text-center shadow-sm">
          ⚠️ Please complete your profile information
        </div>
      )}

      {/* Profile Card */}
      <div className="flex flex-col items-center space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-100 p-1 overflow-hidden border border-gray-200">
            <img
              src={user.avatar_url || FailedImageIcon}
              alt="Profile"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-gray-900">
            {user.first_name} {user.last_name}
          </h2>
          <p className="text-sm text-gray-500 font-medium">@{user.username}</p>
          {user.pronouns && (
            <p className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full inline-block">
              {user.pronouns}
            </p>
          )}
        </div>

        <div className="text-center space-y-1 w-full border-t border-gray-50 pt-4">
          <p className="text-sm text-gray-600">{user.email}</p>
          <p className="text-sm text-gray-500 italic">
            {user.bio || "No bio yet"}
          </p>
        </div>

        <div className="w-full space-y-3 pt-2">
          <Link
            to="/ProfilePage/Edit"
            className="w-full block text-center bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-bold py-3 px-4 rounded-xl transition-colors"
          >
            Edit Profile
          </Link>

          {/* Sign Out Button - Hidden on Desktop (lg:hidden) */}
          <Button
            variant="ghost"
            onClick={handleSignOut}
            disabled={isSigningOut} // ✅ Disable while loading
            className="w-full lg:hidden text-red-600 hover:text-red-700 hover:bg-red-50 h-12 rounded-xl flex items-center justify-center gap-2 border border-transparent hover:border-red-100 disabled:opacity-70"
          >
            {isSigningOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            {isSigningOut ? "Signing Out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </div>
  );
}
