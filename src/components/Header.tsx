import { Link } from "react-router-dom";
import type { JSX } from "react";
import { useAuth } from "@/context/authContext";
import { User, ShieldCheck } from "lucide-react";

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
    // 1. If user has an uploaded avatar, show it
    if (user?.avatar_url) {
      return (
        <img
          src={user.avatar_url}
          alt={user.username || "Profile"}
          className={`h-8 w-8 rounded-full object-cover border-2 ${
            user.role === "admin" ? "border-blue-600" : "border-gray-200"
          }`}
        />
      );
    }

    // 2. Fallback: If Admin, show Shield icon (Blue)
    if (user?.role === "admin") {
      return <ShieldCheck className="h-6 w-6 text-blue-600" />;
    }

    // 3. Fallback: Default User icon (Gray)
    return <User className="h-6 w-6 text-gray-700" />;
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-4">
      {/* LEFT: Real Logo + App Name */}
      <div className="flex items-center gap-2">
        <img
          src={LOGO_PATH}
          alt="PawPal Logo"
          className="h-8 w-8 object-contain"
        />
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>

      {/* RIGHT: Profile Button */}
      {showProfile && (
        <Link
          to="/ProfilePage"
          className="rounded-full p-1 hover:bg-gray-100 transition-colors flex items-center justify-center"
        >
          {renderProfileIcon()}
        </Link>
      )}
    </header>
  );
}
