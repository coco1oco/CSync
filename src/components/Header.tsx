import { Link } from "react-router-dom";
import type { JSX } from "react";
import { useAuth } from "@/context/authContext";
import { User } from "lucide-react";

// Import your Logo from the public folder (referenced as string path in Vite)
// Note: In Vite, files in 'public' are served at the root '/'
const LOGO_PATH = "/Logo.svg";

interface HeaderProps {
  title?: string;
  showProfile?: boolean;
}

export function Header({
  title = "PawPal",
  showProfile = true,
}: Readonly<HeaderProps>): JSX.Element {
  const { user } = useAuth();

  // Helper to determine what to show on the RIGHT side
  const renderProfileIcon = () => {
    const isAdmin = user?.role === "admin";
    // Blue ring for admin, no ring for others
    const ringClasses = isAdmin ? "border-2 border-blue-600" : "";

    // 1. If user has an uploaded avatar, show it
    if (user?.avatar_url) {
      return (
        <img
          src={user.avatar_url}
          alt={user.username || "Profile"}
          className={`h-8 w-8 rounded-full object-cover ${ringClasses}`}
        />
      );
    }

    // 2. Fallback: Default User icon (Gray) for everyone
    return (
      <div
        className={`h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ${ringClasses}`}
      >
        <User className="h-5 w-5 text-gray-600" />
      </div>
    );
  };

  return (
    // ✅ CHANGED: Added 'header-safe' class
    // ✅ CHANGED: Removed fixed h-14 (let padding define height)
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 header-safe px-4 flex items-center justify-between transition-all">
      {/* Your Existing Logo Code */}
      <div className="flex items-center gap-2">
        <img src={LOGO_PATH} alt="PawPal" className="h-8 w-8 object-contain" />
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>
      {/* Your Existing Profile Button */}
      {showProfile && (
        <Link to="/ProfilePage" className="rounded-full p-1 hover:bg-gray-100">
          {renderProfileIcon()}
        </Link>
      )}{" "}
    </header>
  );
}
