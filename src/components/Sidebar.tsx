import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  MessageCircle,
  Bell,
  PawPrint,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import logo from "@/assets/images/Pawpal.svg";
import type { UserRole } from "@/types";

interface SidebarProps {
  userRole: UserRole | null;
}

export function Sidebar({ userRole }: Readonly<SidebarProps>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/messages", icon: MessageCircle, label: "Messages" },
    { path: "/notifications", icon: Bell, label: "Notifications" },
    {
      path: userRole === "admin" ? "/PetDashboard" : "/PetDashboard",
      icon: PawPrint,
      label: userRole === "admin" ? "Pet Dashboard" : "Pet Dashboard",
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/SignIn");
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-gray-200 bg-white z-50">
      {/* 1. Logo Area */}
      <div className="p-6 flex items-center gap-3">
        <img src={logo} alt="PawPal" className="h-8 w-8" />
        <span className="font-bold text-xl text-blue-950">PawPal</span>
      </div>

      {/* 2. Navigation Links */}
      <nav className="flex-1 px-4 space-y-2 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all font-medium ${
                active
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={24} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 3. Profile & Logout (Bottom) */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <Link
          to="/ProfilePage"
          className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all font-medium ${
            isActive("/ProfilePage")
              ? "bg-blue-50 text-blue-600"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <User size={24} />
          <span>Profile</span>
        </Link>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-red-500 hover:bg-red-50 transition-all font-medium"
        >
          <LogOut size={24} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
