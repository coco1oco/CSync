import { Link, useNavigate } from "react-router-dom";
import type { JSX } from "react";
import { Menu, Ticket } from "lucide-react";
import { useAuth } from "@/context/authContext";

const LOGO_PATH = "/PawPal.svg";

interface HeaderProps {
  title?: string;
  showProfile?: boolean;
}

export function Header({
  title = "PawPal",
  showProfile = true,
}: Readonly<HeaderProps>): JSX.Element {
  const { user } = useAuth(); // You might still need this for other logic, or remove if unused
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin"; // Adjust property name as needed

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 header-safe px-4 flex items-center justify-between transition-all">
      {/* Left: Logo & Title */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => navigate("/")}
      >
        <img src={LOGO_PATH} alt="PawPal" className="h-8 w-8 object-contain" />
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>

      {/* Right Area */}
      <div className="flex items-center gap-2">
        {/* ✅ FIXED TICKET BUTTON: Always visible if profile is shown */}
        {showProfile && !isAdmin && (
          <button
            onClick={() => navigate("/my-tickets")}
            className="rounded-full p-2 text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
            title="My Tickets"
          >
            <Ticket className="h-6 w-6" />
          </button>
        )}

        {/* Menu Button */}
        {showProfile && (
          <Link
            to="/settings"
            className="rounded-full p-2 hover:bg-gray-100 text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <Menu className="h-6 w-6" />
          </Link>
        )}
      </div>
    </header>
  );
}
