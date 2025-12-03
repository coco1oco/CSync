import { useNavigate, useLocation } from "react-router-dom";
import type { UserRole } from "@/types";
import { Home, MessageCircle, Bell, PawPrint } from "lucide-react"; // ✅ Using PawPrint icon

interface BottomNavigationProps {
  userRole: UserRole | null;
}

export function BottomNavigation({
  userRole,
}: Readonly<BottomNavigationProps>) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string): boolean => location.pathname === path;

  const navItems = [
   { path: "/", icon: Home, label: "Home" },
    { path: "/messages", icon: MessageCircle, label: "Messages" },
    { path: "/notifications", icon: Bell, label: "Notifications" },
    // 4th item changes based on role
    {
      path: userRole === "admin" ? "/PetDashboard" : "/PetDashboard",
      icon: PawPrint,
      label: userRole === "admin" ? "PetDashboard" : "PetDashboard",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white z-50 pb-safe">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
        {navItems.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-colors ${
              isActive(path)
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            aria-label={label}
          >
            <Icon size={24} strokeWidth={isActive(path) ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
