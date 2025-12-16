import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  MessageCircle,
  Bell,
  PawPrint,
  LogOut,
  User,
  Loader2,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { useChat } from "@/context/ChatContext"; // ✅ IMPORTED
import logo from "@/assets/images/PawPal.svg";
import type { UserRole } from "@/types";

interface SidebarProps {
  userRole: UserRole | null;
}

export function Sidebar({ userRole }: Readonly<SidebarProps>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { unreadCount } = useChat(); // ✅ GET COUNT
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/messages", icon: MessageCircle, label: "Messages" },

    ...(userRole === "admin"
      ? [
          { path: "/admin/team", icon: Users, label: "Manage Team" },
          { path: "/notifications", icon: Bell, label: "Notifications" },
        ]
      : [
          { path: "/notifications", icon: Bell, label: "Notifications" },
        ]),

    {
      path: "/PetDashboard",
      icon: PawPrint,
      label: "Pet Dashboard",
    },
  ];


  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/SignIn");
    } catch (error) {
      console.error("Sign out failed", error);
      setIsSigningOut(false);
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-gray-200 bg-white z-50">
      <div className="p-6 flex items-center gap-3">
        <img src={logo} alt="PawPal" className="h-8 w-8" />
        <span className="font-bold text-xl text-blue-950">PawPal</span>
      </div>

      <nav className="flex-1 px-4 space-y-2 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all font-medium relative ${
                active
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div className="relative">
                <Icon size={24} strokeWidth={active ? 2.5 : 2} />

                {/* ✅ BADGE LOGIC */}
                {item.label === "Messages" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center border-2 border-white shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {item.label}
            </Link>
          );
        })}
      </nav>

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
          disabled={isSigningOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-red-500 hover:bg-red-50 transition-all font-medium disabled:opacity-50"
        >
          {isSigningOut ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <LogOut size={24} />
          )}
          <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
        </button>
      </div>
    </aside>
  );
}
