import { Link } from "react-router-dom";
import type { JSX } from "react";
import { Menu } from "lucide-react"; // Import Menu icon

const LOGO_PATH = "/Logo.svg";

interface HeaderProps {
  title?: string;
  showProfile?: boolean;
}

export function Header({
  title = "PawPal",
  showProfile = true,
}: Readonly<HeaderProps>): JSX.Element {
  
  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 header-safe px-4 flex items-center justify-between transition-all">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-2">
        <img src={LOGO_PATH} alt="PawPal" className="h-8 w-8 object-contain" />
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>

      {/* Right: Menu Icon -> Links to Settings */}
      {showProfile && (
        <Link 
          to="/settings" 
          className="rounded-full p-2 hover:bg-gray-100 text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          <Menu className="h-6 w-6" />
        </Link>
      )}
    </header>
  );
}