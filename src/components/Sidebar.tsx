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
  Menu // Added for mobile if needed
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { useChat } from "@/context/ChatContext";
import logo from "@/assets/images/Pawpal.svg";
import type { UserRole } from "@/types";
import { NotificationCenter } from "./NotificationCenter";

interface SidebarProps {
  userRole: UserRole | null;
}

export function Sidebar({ userRole }: Readonly<SidebarProps>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { unreadCount } = useChat();
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  // State for the panel
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const adminNotificationCount = userRole === "admin" ? 3 : 0;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try { await signOut(); navigate("/SignIn"); } 
    catch (error) { setIsSigningOut(false); }
  };

  const handleNotificationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Toggle the panel
    setIsNotificationPanelOpen(!isNotificationPanelOpen);
  };

  // Helper to determine sidebar width class
  // Instagram logic: Wide normally (w-64), Narrow when panel is open (w-[72px])
  const sidebarWidthClass = isNotificationPanelOpen ? "w-[72px]" : "w-64";
  const hideTextClass = isNotificationPanelOpen ? "hidden" : "block";
  const justifyClass = isNotificationPanelOpen ? "justify-center" : "justify-start";
  const pxClass = isNotificationPanelOpen ? "px-2" : "px-4";

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/messages", icon: MessageCircle, label: "Messages" },
    ...(userRole === "admin"
      ? [
          { path: "/admin/team", icon: Users, label: "Manage Team" },
          { path: "/notifications", icon: Bell, label: "Notifications", adminNotificationCount, isButton: true },
        ]
      : [
          { path: "/notifications", icon: Bell, label: "Notifications", isButton: true },
        ]),
    { path: "/PetDashboard", icon: PawPrint, label: "Pet Dashboard" },
  ];

  return (
    <>
      {/* SIDEBAR CONTAINER */}
      <aside 
        className={`hidden lg:flex flex-col h-screen fixed left-0 top-0 border-r border-gray-200 bg-white z-[60] transition-all duration-300 ease-in-out ${sidebarWidthClass}`}
      >
        {/* Logo Section */}
        <div className={`h-16 flex items-center ${justifyClass} ${isNotificationPanelOpen ? '' : 'px-6 gap-3'}`}>
          <img src={logo} alt="PawPal" className="h-8 w-8 transition-transform hover:scale-105" />
          <span className={`font-bold text-xl text-blue-950 transition-opacity duration-200 ${hideTextClass}`}>
            PawPal
          </span>
        </div>

        {/* Navigation Items */}
        <nav className={`flex-1 space-y-2 py-4 ${pxClass}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            // Highlight if active path OR if notification panel is open and this is the notification button
            const isNotifActive = item.label === "Notifications" && isNotificationPanelOpen;
            const active = isActive(item.path) || isNotifActive;

            const buttonClasses = `
              w-full flex items-center ${justifyClass} py-3 rounded-full transition-all font-medium relative group
              ${active ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
              ${isNotificationPanelOpen ? 'px-0' : 'px-4 gap-3'}
            `;

            const content = (
              <>
                <div className="relative">
                  <Icon size={24} strokeWidth={active ? 2.5 : 2} className="transition-transform group-hover:scale-105" />
                  
                  {/* Badges */}
                  {item.label === "Messages" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center border-2 border-white shadow-sm">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  {item.label === "Notifications" && userRole === "admin" && (item.adminNotificationCount ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full border-2 border-white shadow-sm"></span>
                  )}
                </div>
                
                {/* Text Label (Hidden when collapsed) */}
                <span className={`whitespace-nowrap transition-opacity duration-200 ${hideTextClass}`}>
                  {item.label}
                </span>

                {/* Tooltip for collapsed mode (Optional UX enhancement) */}
                {isNotificationPanelOpen && (
                   <div className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                     {item.label}
                   </div>
                )}
              </>
            );

            if (item.isButton) {
              return (
                <button key={item.path} onClick={handleNotificationClick} className={buttonClasses}>
                  {content}
                </button>
              );
            }
            return (
              <Link key={item.path} to={item.path} className={buttonClasses}>
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Profile Section */}
        <div className={`border-t border-gray-100 space-y-2 py-4 ${pxClass}`}>
          <Link
            to="/ProfilePage"
            className={`flex items-center ${justifyClass} py-3 rounded-full transition-all font-medium group
              ${isActive("/ProfilePage") ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}
              ${isNotificationPanelOpen ? 'px-0' : 'px-4 gap-3'}
            `}
          >
            <User size={24} />
            <span className={hideTextClass}>Profile</span>
          </Link>

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={`w-full flex items-center ${justifyClass} py-3 rounded-full text-red-500 hover:bg-red-50 transition-all font-medium disabled:opacity-50 group
               ${isNotificationPanelOpen ? 'px-0' : 'px-4 gap-3'}
            `}
          >
            {isSigningOut ? <Loader2 size={24} className="animate-spin" /> : <LogOut size={24} />}
            <span className={hideTextClass}>{isSigningOut ? "..." : "Sign Out"}</span>
          </button>
          <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
          <img
            src="/Paws2.jpg" // You'll need to add this image to public/
            alt="PAWS Logo"
            className="w-8 h-8 grayscale"
          />
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">
              Affiliated with
            </p>
            <p className="text-xs font-bold text-gray-700">PAWS Philippines</p>
          </div>
        </div>
      </div>
        </div>
      </aside>

      {/* RENDER PANEL - Pass "isCollapsed" logic if needed, but styling is handled in Center */}
      <NotificationCenter 
        variant="panel" 
        isOpen={isNotificationPanelOpen} 
        onClose={() => setIsNotificationPanelOpen(false)} 
      />
    </>
  );
}