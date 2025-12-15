import { useNavigate, useLocation } from "react-router-dom";
import type { UserRole } from "@/types";
import { Home, MessageCircle, Bell, PawPrint, Users } from "lucide-react";
import { useChat } from "@/context/ChatContext"; // ✅ IMPORTED

interface BottomNavigationProps {
  userRole: UserRole | null;
}

export function BottomNavigation({
  userRole,
}: Readonly<BottomNavigationProps>) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useChat(); // ✅ GET COUNT

  const isActive = (path: string): boolean => location.pathname === path;

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/messages", icon: MessageCircle, label: "Messages" },
    ...(userRole === "admin"
      ? [{ path: "/admin/team", icon: Users, label: "Team" }]
      : [{ path: "/notifications", icon: Bell, label: "Alerts" }]),
    {
      path: "/PetDashboard",
      icon: PawPrint,
      label: "Pets",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white z-50">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
        {navItems.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-colors min-w-[64px] relative ${
              isActive(path)
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            aria-label={label}
          >
            <div className="relative">
              <Icon size={24} strokeWidth={isActive(path) ? 2.5 : 2} />

              {/* ✅ BADGE LOGIC */}
              {label === "Messages" && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] flex items-center justify-center border border-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
